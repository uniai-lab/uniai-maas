/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { statSync } from 'fs'
import { EggFile } from 'egg-multipart'
import { extname } from 'path'
import { AIAuditResponse, AuditResponse, ChatMessage, ChatResponse, ResourcePage } from '@interface/controller/UniAI'
import { GPTChatMessage } from '@interface/OpenAI'
import { GLMChatMessage } from '@interface/GLM'
import { SPKChatMessage } from '@interface/Spark'
import {
    ChatModelEnum,
    ChatRoleEnum,
    ChatSubModelEnum,
    ContentAuditEnum,
    EmbedModelEnum,
    GLMSubModel,
    GPTSubModel,
    ImgModelEnum,
    MJTaskEnum,
    SPKSubModel
} from '@interface/Enum'
import resourceType from '@data/resourceType'
import userResourceTab from '@data/userResourceTab'

import { Resource } from '@model/Resource'
import glm from '@util/glm'
import gpt from '@util/openai'
import fly from '@util/fly'
import sd from '@util/sd'
import mj from '@util/mj'
import $ from '@util/util'
import { PassThrough, Readable } from 'stream'
import { createParser } from 'eventsource-parser'
import { UserContext } from '@interface/Context'

const MAX_PAGE = 6
const MAX_TOKEN = 8192
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

    // query resource
    async queryResource(
        prompts: ChatMessage[],
        resourceId?: number,
        model: EmbedModelEnum = EmbedModelEnum.GLM,
        maxPage: number = MAX_PAGE,
        maxToken: number = MAX_TOKEN
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
            if (model === EmbedModelEnum.GPT) count = await ctx.model.Embedding1.count({ where })
            else if (model === EmbedModelEnum.GLM) count = await ctx.model.Embedding2.count({ where })

            // embedding not exist, create embeddings
            if (!count) await this.embedding(model, resourceId)
        }

        const pages: ResourcePage[] = []

        for (const { content } of prompts) {
            if (!content || typeof content !== 'string') continue
            const query = content.trim()
            if (model === EmbedModelEnum.GPT) {
                const embed = await gpt.embedding([query])
                const embedding = embed.data[0].embedding
                const res = await ctx.model.Embedding1.similarFindAll(embedding, maxPage, where)
                while (res.reduce((n, p) => n + $.countTokens(p.content), 0) > maxToken) res.pop()
                for (const item of resourceId ? res.sort((a, b) => a.page - b.page) : res)
                    pages.push({
                        id: item.id,
                        resourceId: item.resourceId,
                        page: item.page,
                        content: item.content,
                        similar: $.cosine(embedding, item.embedding || [])
                    })
            } else if (model === EmbedModelEnum.GLM) {
                const embed = await glm.embedding([query])
                const embedding = embed.data[0]
                const res = await ctx.model.Embedding2.similarFindAll(embedding, maxPage, where)
                while (res.reduce((n, p) => n + $.countTokens(p.content), 0) > maxToken) res.pop()
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
        prompts: ChatMessage[],
        stream: boolean = false,
        model: ChatModelEnum = ChatModelEnum.SPARK,
        subModel?: ChatSubModelEnum,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        if (model === ChatModelEnum.GPT) {
            subModel = (subModel as GPTSubModel) || (await this.getConfig<GPTSubModel>('GPT_DEFAULT_SUB_MODEL'))
            return await gpt.chat(subModel, prompts as GPTChatMessage[], stream, top, temperature, maxLength)
        } else if (model === ChatModelEnum.GLM) {
            subModel = (subModel as GLMSubModel) || (await this.getConfig<GLMSubModel>('GLM_DEFAULT_SUB_MODEL'))
            return await glm.chat(subModel, prompts as GLMChatMessage[], stream, top, temperature, maxLength)
        } else if (model === ChatModelEnum.SPARK) {
            subModel = (subModel as SPKSubModel) || (await this.getConfig<SPKSubModel>('SPK_DEFAULT_SUB_MODEL'))
            return await fly.chat(subModel, prompts as SPKChatMessage[], stream, top, temperature, maxLength)
        } else throw new Error('Chat model not found')
    }

    // concat chat stream chunk
    concatChunk(stream: Readable) {
        const output = new PassThrough()
        let content = ''
        const parser = createParser(e => {
            if (e.type === 'event') {
                const obj = $.json<ChatResponse>(e.data)
                if (obj) {
                    obj.content = content += obj.content
                    output.write(`data: ${JSON.stringify(obj)}\n\n`)
                }
            }
        })

        stream.on('data', (buff: Buffer) => parser.feed(buff.toString('utf-8')))
        stream.on('error', e => output.destroy(e))
        stream.on('end', () => output.end())
        stream.on('close', () => parser.reset())
        return output as Readable
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

        // split and embedding first page
        const firstPage = $.splitPage(content, TOKEN_PAGE_FIRST)[0]
        if (!firstPage) throw new Error('Fail to split first page')
        const embedding = (await glm.embedding([firstPage])).data[0]
        if (!embedding) throw new Error('Fail to embed first page')

        // try to find the similar resource
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
        model: EmbedModelEnum = EmbedModelEnum.GLM,
        resourceId?: number,
        content?: string,
        fileName?: string,
        filePath?: string,
        fileExt?: string,
        fileSize?: number,
        userId: number = 0,
        typeId: number = 1
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

            // split and embedding first page
            const firstPage: string = $.splitPage(content, TOKEN_PAGE_FIRST)[0]
            if (!firstPage) throw new Error('Fail to split first page')
            embedding = (await glm.embedding([firstPage])).data[0]

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

            // embedding first page
            const firstPage: string = $.splitPage(content, TOKEN_PAGE_FIRST)[0]
            if (!firstPage) throw new Error('First page can not be split')
            embedding = (await glm.embedding([firstPage])).data[0]

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
        if (model === EmbedModelEnum.GPT) {
            await ctx.model.Embedding1.destroy({ where: { resourceId } })
            const res = await gpt.embedding(pages)
            const embeddings = res.data.map(({ embedding }, i) => ({
                resourceId,
                page: i + 1,
                embedding,
                content: pages[i],
                tokens: $.countTokens(pages[i])
            }))
            resource.embeddings1 = await ctx.model.Embedding1.bulkCreate(embeddings)
        } else if (model === EmbedModelEnum.GLM) {
            await ctx.model.Embedding2.destroy({ where: { resourceId } })
            const res = await glm.embedding(pages)
            const embeddings = res.data.map((embedding, i) => ({
                resourceId,
                page: i + 1,
                embedding,
                content: pages[i],
                tokens: $.countTokens(pages[i])
            }))
            resource.embeddings2 = await ctx.model.Embedding2.bulkCreate(embeddings)
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

    // check content by iFlyTek, WeChat or mint-filter
    // content is text or image, image should be base64 string
    async audit(content: string, provider?: ContentAuditEnum) {
        content = content.replace(/\r\n|\n/g, ' ').trim()
        if (!content) throw new Error('Audit content is empty')

        const res: AuditResponse = { flag: true, data: null }
        const ctx = this.ctx as UserContext

        provider = provider || (await this.getConfig<ContentAuditEnum>('CONTENT_AUDITOR'))
        if (provider === ContentAuditEnum.WX) {
            const result = await ctx.service.weChat.contentCheck(content, ctx.user?.wxOpenId || '')
            res.flag = result.result ? result.result.suggest === 'pass' : result.errcode === 0
            res.data = result
        } else if (provider === ContentAuditEnum.FLY) {
            const result = await fly.audit(content)
            res.flag = result.code === '000000' && result.data.result.suggest === 'pass'
            res.data = result
        } else if (provider === ContentAuditEnum.AI) {
            const model = await this.getConfig<ChatModelEnum>('AUDITOR_AI_MODEL')
            const subModel = await this.getConfig<ChatSubModelEnum>('AUDITOR_AI_SUB_MODEL')
            const prompt = await this.getConfig('AUDITOR_AI_PROMPT')
            const message: ChatMessage[] = [{ role: ChatRoleEnum.SYSTEM, content: prompt + content }]

            try {
                const result = await ctx.service.uniAI.chat(message, false, model, subModel, 1, 0.1)
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
}
