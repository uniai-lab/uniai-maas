/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { statSync } from 'fs'
import { EggFile } from 'egg-multipart'
import { extname } from 'path'
import { AIAuditResponse, AuditResponse, ResourcePage } from '@interface/controller/UniAI'
import { ChatMessage, ChatModel, ChatResponse, ChatRoleEnum, GLMChatModel, ModelProvider } from 'uniai'
import { AuditProvider, ImgModelEnum, MJTaskEnum } from '@interface/Enum'
import resourceType from '@data/resourceType'
import userResourceTab from '@data/userResourceTab'

import { Resource } from '@model/Resource'
import { PassThrough, Readable } from 'stream'
import { UserContext } from '@interface/Context'

import gpt from '@util/openai'
import fly from '@util/fly'
import sd from '@util/sd'
import mj from '@util/mj'
import $ from '@util/util'
import ai from '@util/ai'

const MAX_PAGE = 10
const SAME_DISTANCE = 0.01
const TOKEN_PAGE_FIRST = 768
const TOKEN_PAGE_SPLIT_L1 = 2048
const TOKEN_PAGE_SPLIT_L2 = 1024
const TOKEN_PAGE_SPLIT_L3 = 512
const TOKEN_PAGE_TOTAL_L1 = TOKEN_PAGE_SPLIT_L1 * 1
const TOKEN_PAGE_TOTAL_L2 = TOKEN_PAGE_SPLIT_L2 * 8
const DEFAULT_IMAGINE_NUM = 1
const DEFAULT_IMAGINE_WIDTH = 1024
const DEFAULT_IMAGINE_HEIGHT = 1024
const DEFAULT_RESOURCE_TYPE = resourceType[0].id
const DEFAULT_RESOURCE_TAB = userResourceTab[0].id

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class UniAI extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        const { app, ctx } = this
        let value = await app.redis.get(key)
        if (!value) {
            // config not in cache
            const res = await ctx.model.Config.findOne({ attributes: ['value'], where: { key } })
            if (res && res.value) {
                await app.redis.set(key, res.value)
                value = res.value
            } else throw new Error(`Config: ${key} not found`)
        }
        return $.json<T>(value) || (value as T)
    }

    async getModels() {
        return ai.list()
    }

    // query resource
    async queryResource(
        prompts: ChatMessage[],
        resourceId?: number,
        model: ModelProvider = ModelProvider.Other,
        maxPage: number = MAX_PAGE
    ) {
        const { ctx } = this

        const where: { resourceId?: number } = {}
        // give specific resource id
        if (resourceId) {
            // check resource exist
            const resource = await ctx.model.Resource.count({ where: { id: resourceId } })
            if (!resource) throw new Error('Resource not found')
            where.resourceId = resourceId

            // check embeddings exist
            let count = 0
            if (model === ModelProvider.OpenAI) count = await ctx.model.Embedding1.count({ where })
            else if (model === ModelProvider.Other) count = await ctx.model.Embedding2.count({ where })
            else throw new Error('Model provider not support')

            // embedding not exist, create embeddings
            if (!count) await this.embedding(model, resourceId)
        }

        const pages: ResourcePage[] = []

        for (const { content } of prompts) {
            if (!content || typeof content !== 'string') continue
            const query = content.trim()
            const data = await ai.embed([query], model)
            const embedding = data.embedding[0]

            if (model === ModelProvider.OpenAI) {
                const res = await ctx.model.Embedding1.similarFindAll(embedding, maxPage, where)
                for (const item of resourceId ? res.sort((a, b) => a.page - b.page) : res)
                    pages.push({
                        id: item.id,
                        resourceId: item.resourceId,
                        page: item.page,
                        content: item.content,
                        similar: $.cosine(embedding, item.embedding || [])
                    })
            } else if (model === ModelProvider.Other) {
                const res = await ctx.model.Embedding2.similarFindAll(embedding, maxPage, where)
                for (const item of resourceId ? res.sort((a, b) => a.page - b.page) : res)
                    pages.push({
                        id: item.id,
                        resourceId: item.resourceId,
                        page: item.page,
                        content: item.content,
                        similar: $.cosine(embedding, item.embedding || [])
                    })
            } else throw new Error('Embedding model not found')
        }

        return pages
    }

    // chat to model
    async chat(
        messages: ChatMessage[],
        stream: boolean = false,
        provider: ModelProvider = ModelProvider.GLM,
        model?: ChatModel,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        return ai.chat(messages, provider, model, stream, top, temperature, maxLength)
    }

    // concat chat stream chunk
    concatChunk(input: Readable) {
        const output = new PassThrough()

        let content = ''
        input.on('data', (e: Buffer) => {
            const data = $.json<ChatResponse>(e.toString())
            if (data) {
                data.content = content += data.content
                output.write(JSON.stringify(data))
            }
        })

        input.on('error', e => output.destroy(e))
        input.on('end', () => output.end())

        return output as Readable
    }

    // get file stream from path or url
    async fileStream(path: string) {
        return await $.getFileStream(path)
    }

    // upload file
    async upload(
        file: EggFile,
        userId?: number,
        typeId: number = DEFAULT_RESOURCE_TYPE,
        tabId: number = DEFAULT_RESOURCE_TAB
    ) {
        const { ctx } = this

        // limit upload file size
        const fileSize = statSync(file.filepath).size
        if (fileSize > parseInt(await this.getConfig('LIMIT_UPLOAD_SIZE'))) throw new Error('File size exceeds limit')

        // get content
        const { content, page } = await $.convertText(file.filepath)
        if (!content) throw new Error('Fail to extract content text')

        // split and embed first page
        const embedding = await this.embedFirstPage(content)
        // find the similar resource
        const resources = await ctx.model.Resource.similarFindAll(embedding, SAME_DISTANCE)

        // find or create resource
        return (
            resources[0] ||
            (await ctx.model.Resource.create({
                page,
                content,
                userId,
                typeId,
                tabId,
                fileName: file.filename,
                filePath: await $.putOSS(file.filepath),
                fileSize,
                fileExt: extname(file.filepath).replace('.', ''),
                embedding,
                tokens: $.countTokens(content)
            }))
        )
    }

    // create embedding
    async embedding(
        model: ModelProvider = ModelProvider.Other,
        resourceId?: number,
        content?: string,
        fileName?: string,
        filePath?: string,
        fileExt?: string,
        fileSize?: number,
        userId: number = 0,
        typeId: number = DEFAULT_RESOURCE_TYPE,
        tabId: number = DEFAULT_RESOURCE_TAB
    ) {
        const { ctx } = this
        let resource: Resource | null = null
        let embedding: number[] | null = null

        // find by resource id
        if (resourceId) {
            resource = await ctx.model.Resource.findByPk(resourceId)
            if (!resource) throw new Error('Can not find resource by id')

            content = $.tinyText(resource.content)
            fileName = resource.fileName
            filePath = resource.filePath
            fileSize = resource.fileSize
            fileExt = resource.fileExt

            // embed first page
            embedding = await this.embedFirstPage(content)

            resource.embedding = embedding
        }
        // find by resource content
        else {
            // check all resource info
            if (!content) throw new Error('File content is empty')
            if (!fileName) throw new Error('File name is empty')
            if (!filePath) throw new Error('File path is empty')
            if (!fileSize) throw new Error('File size is empty')
            fileExt = fileExt || extname(filePath).replace('.', '')
            if (!fileExt) throw new Error('Can not detect file extension')
            content = $.tinyText(content)

            // embed first page
            embedding = await this.embedFirstPage(content)

            // find resource by embedding
            const resources = await ctx.model.Resource.similarFindAll(embedding, SAME_DISTANCE)
            resource = resources[0]
            if (resource) {
                fileName = resource.fileName
                filePath = resource.filePath
                fileSize = resource.fileSize
                fileExt = resource.fileExt
                resource.embedding = embedding
            }
        }

        // check embedding
        if (!embedding) throw new Error('Fail to embed first page')

        // split pages
        const tokens = $.countTokens(content)
        let split = TOKEN_PAGE_SPLIT_L1
        if (tokens <= TOKEN_PAGE_TOTAL_L1) split = TOKEN_PAGE_SPLIT_L1
        else if (tokens <= TOKEN_PAGE_TOTAL_L2) split = TOKEN_PAGE_SPLIT_L2
        else split = TOKEN_PAGE_SPLIT_L3
        const pages: string[] = $.splitPage(content, split)
        if (!pages.length) throw new Error('Content can not be split')

        if (!resource)
            resource = await ctx.model.Resource.create({
                page: pages.length,
                content,
                typeId,
                tabId,
                userId,
                fileName,
                filePath,
                fileSize,
                fileExt,
                embedding,
                tokens: $.countTokens(content)
            })

        if (!resource) throw new Error('Fail to create resource for embedding')
        resourceId = resource.id

        // embedding resource
        const res = await ai.embed(pages, model)
        if (model === ModelProvider.OpenAI) {
            await ctx.model.Embedding1.destroy({ where: { resourceId } })
            resource.embeddings1 = await ctx.model.Embedding1.bulkCreate(
                res.embedding.map((embedding, i) => ({
                    resourceId,
                    page: i + 1,
                    embedding,
                    content: pages[i],
                    tokens: $.countTokens(pages[i])
                }))
            )
        } else if (model === ModelProvider.Other) {
            await ctx.model.Embedding2.destroy({ where: { resourceId } })
            resource.embeddings2 = await ctx.model.Embedding2.bulkCreate(
                res.embedding.map((embedding, i) => ({
                    resourceId,
                    page: i + 1,
                    embedding,
                    content: pages[i],
                    tokens: $.countTokens(pages[i])
                }))
            )
        } else throw new Error('Embedding model not found')

        return await resource.save()
    }

    imagine(
        prompt: string,
        nPrompt: string = '',
        num: number = DEFAULT_IMAGINE_NUM,
        width: number = DEFAULT_IMAGINE_WIDTH,
        height: number = DEFAULT_IMAGINE_HEIGHT,
        model: ImgModelEnum = ImgModelEnum.DALLE
    ) {
        const { SD, DALLE, MJ } = ImgModelEnum
        if (model === SD) return sd.imagine(prompt, nPrompt, width, height, num)
        else if (model === DALLE) return gpt.imagine(prompt, nPrompt, width, height, num)
        else if (model === MJ) return mj.imagine(prompt, nPrompt, width, height)
        else throw new Error('Image imagine model not found')
    }

    task(id: string, model: ImgModelEnum = ImgModelEnum.MJ) {
        const { SD, MJ } = ImgModelEnum
        if (model === MJ) return mj.task(id)
        else if (model === SD) return sd.task()
        else throw new Error('Image task model not found')
    }

    change(id: string, action: string, index?: number, model: ImgModelEnum = ImgModelEnum.MJ) {
        const { MJ } = ImgModelEnum
        if (model === MJ) return mj.change(id, action as MJTaskEnum, index)
        else throw new Error('Image change model not found')
    }

    queue(model: ImgModelEnum = ImgModelEnum.MJ) {
        const { MJ } = ImgModelEnum
        if (model === MJ) return mj.queue()
        else throw new Error('Image queue model not found')
    }

    // check content by AI, iFlyTek, WeChat or mint-filter
    // content is text or image, image should be base64 string
    async audit(content: string, provider: AuditProvider = AuditProvider.MINT) {
        content = content.replace(/\r\n|\n/g, ' ').trim()
        if (!content) throw new Error('Audit content is empty')

        const res: AuditResponse = { flag: true, data: null }
        const ctx = this.ctx as UserContext

        if (provider === AuditProvider.WX) {
            const result = await ctx.service.weChat.contentCheck(content, ctx.user?.wxOpenId || '')
            res.flag = result.result ? result.result.suggest === 'pass' : result.errcode === 0
            res.data = result
        } else if (provider === AuditProvider.FLY) {
            const result = await fly.audit(content)
            res.flag = result.code === '000000' && result.data.result.suggest === 'pass'
            res.data = result
        } else if (provider === AuditProvider.AI) {
            const prompt = await this.getConfig('AUDIT_PROMPT')
            const message: ChatMessage[] = [{ role: ChatRoleEnum.SYSTEM, content: prompt + content }]

            try {
                const result = await ai.chat(message, ModelProvider.GLM, GLMChatModel.GLM_6B, false, 1, 0)
                const json = $.json<AIAuditResponse>((result as ChatResponse).content)
                res.flag = json?.safe || false
                res.data = result
            } catch (e) {
                res.flag = false
                res.data = e as Error
            }
        } else {
            const result = $.contentFilter(content)
            res.flag = result.verify
            res.data = result
        }

        // log audit
        await ctx.model.AuditLog.create({ provider, content, userId: ctx.user?.id, ...res })

        return res
    }

    // split the content and embedding the first page
    async embedFirstPage(content: string) {
        const page = $.splitPage(content, TOKEN_PAGE_FIRST)
        if (!page.length) throw new Error('Fail to split first page')
        const { embedding } = await ai.embed([page[0]])
        if (!embedding.length) throw new Error('Fail to embed first page')
        return embedding[0]
    }
}
