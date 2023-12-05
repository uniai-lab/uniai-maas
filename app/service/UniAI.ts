/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { PassThrough, Readable } from 'stream'
import { createParser } from 'eventsource-parser'
import { statSync } from 'fs'
import { EggFile } from 'egg-multipart'
import { extname } from 'path'
import { ChatMessage, ChatResponse, ResourcePage } from '@interface/controller/UniAI'
import { GPTChatMessage, GPTChatStreamResponse } from '@interface/OpenAI'
import { GLMChatMessage, GLMChatStreamResponse } from '@interface/GLM'
import { SPKChatMessage, SPKChatResponse } from '@interface/Spark'
import {
    ChatModelEnum,
    ChatSubModelEnum,
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
                        similar: $.cosine(embedding, item.embedding)
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
                        similar: $.cosine(embedding, item.embedding)
                    })
            } else throw new Error('Embedding model not found')
        }

        return pages
    }

    // chat to model
    async chat(
        prompts: ChatMessage[],
        stream: boolean = false,
        model: ChatModelEnum = ChatModelEnum.GLM,
        subModel?: ChatSubModelEnum,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        if (model === ChatModelEnum.GPT) {
            subModel = (subModel as GPTSubModel) || (await this.getConfig<GPTSubModel>('GPT_DEFAULT_SUB_MODEL'))
            return await gpt.chat(subModel, prompts as GPTChatMessage[], stream, top, temperature, maxLength)
        } else if (model === ChatModelEnum.GLM) {
            subModel = (subModel as GLMSubModel) || (await this.getConfig<GPTSubModel>('GLM_DEFAULT_SUB_MODEL'))
            return await glm.chat(subModel, prompts as GLMChatMessage[], stream, top, temperature, maxLength)
        } else if (model === ChatModelEnum.SPARK) {
            subModel = (subModel as SPKSubModel) || (await this.getConfig<SPKSubModel>('SPK_DEFAULT_SUB_MODEL'))
            return await fly.chat(subModel, prompts as SPKChatMessage[], stream, top, temperature, maxLength)
        } else throw new Error('Chat model not found')
    }

    // handle chat stream
    parseSSE(message: Readable, model: ChatModelEnum = ChatModelEnum.GLM, chunk: boolean = false) {
        this.ctx.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
        // define return data
        const res: StandardResponse<ChatResponse> = {
            status: 1,
            data: { content: '', promptTokens: 0, completionTokens: 0, totalTokens: 0, model: '', object: '' },
            msg: 'success to get chat stream message'
        }
        // count tokens
        const stream = new PassThrough()
        const parser = createParser(e => {
            if (e.type === 'event') {
                if (model === ChatModelEnum.GPT) {
                    const obj = $.json<GPTChatStreamResponse>(e.data)
                    if (obj?.choices[0].delta?.content) {
                        if (chunk) res.data.content = obj.choices[0].delta.content
                        else res.data.content += obj.choices[0].delta.content
                        res.data.model = obj.model
                        res.data.object = obj.object
                        stream.write(`data: ${JSON.stringify(res)}\n\n`)
                    }
                }
                if (model === ChatModelEnum.GLM) {
                    const obj = $.json<GLMChatStreamResponse>(e.data)
                    if (obj?.choices[0].delta?.content) {
                        if (chunk) res.data.content = obj.choices[0].delta.content
                        else res.data.content += obj.choices[0].delta.content
                        res.data.model = obj.model
                        res.data.object = obj.object
                        stream.write(`data: ${JSON.stringify(res)}\n\n`)
                    }
                }
                if (model === ChatModelEnum.SPARK) {
                    const obj = $.json<SPKChatResponse>(e.data)
                    if (obj?.payload.choices.text[0].content) {
                        const { payload } = obj
                        if (chunk) res.data.content = payload.choices.text[0].content
                        else res.data.content += payload.choices.text[0].content
                        res.data.completionTokens = payload.usage?.text.completion_tokens || 0
                        res.data.promptTokens = payload.usage?.text.prompt_tokens || 0
                        res.data.totalTokens = payload.usage?.text.total_tokens || 0
                        res.data.model = payload.model
                        res.data.object = payload.object
                        stream.write(`data: ${JSON.stringify(res)}\n\n`)
                    }
                }
            }
        })

        message.on('data', (buff: Buffer) => parser.feed(buff.toString('utf8')))
        message.on('error', e => {
            res.data.content = e.message
            stream.write(`data: ${JSON.stringify(res)}\n\n`)
            stream.end()
        })
        message.on('end', () => stream.end())
        message.on('close', () => parser.reset())
        return stream as Readable
    }

    // upload file
    async upload(
        file: EggFile,
        userId?: number,
        typeId: number = DEFAULT_RESOURCE_TYPE,
        tabId: number = DEFAULT_RESOURCE_TAB
    ) {
        const { ctx } = this
        const limit = await this.getConfig('LIMIT_UPLOAD_SIZE')

        // limit upload file size
        const fileSize = statSync(file.filepath).size
        if (fileSize > parseInt(limit)) throw new Error('File size exceeds limit')
        const fileName = file.filename
        let filePath = file.filepath // local tmp file path
        const fileExt = extname(filePath).replace('.', '')

        // get content
        const { content, page } = await $.convertText(filePath)
        if (!content) throw new Error('Fail to extract content text')

        // split and embedding first page
        const firstPage: string[] = $.splitPage(content, TOKEN_PAGE_FIRST)
        if (!firstPage[0]) throw new Error('Fail to split first page')
        const res = await glm.embedding([firstPage[0]])
        const embedding = res.data[0]
        const resources = await ctx.model.Resource.similarFindAll2(embedding, 1, SAME_DISTANCE)
        let resource = resources[0]

        if (!resource) {
            // uploading original file and page imgs
            filePath = await $.putOSS(filePath, process.env.OSS_TYPE)

            // save to db
            resource = await ctx.model.Resource.create({
                page,
                content,
                userId,
                typeId,
                tabId,
                fileName,
                filePath,
                fileSize,
                fileExt,
                embedding2: embedding,
                tokens: $.countTokens(content)
            })
        }

        return resource
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
            content = resource.content
            fileName = resource.fileName
            filePath = resource.filePath
            fileSize = resource.fileSize
            fileExt = resource.fileExt
            embedding = resource.embedding2
        }
        // try to find by content
        else {
            if (!content) throw new Error('File content is empty')
            content = $.tinyText(content)
            // split first page
            const firstPage: string[] = $.splitPage(content, TOKEN_PAGE_FIRST)
            if (!firstPage[0]) throw new Error('First page can not be split')

            // embedding first page
            const res = await glm.embedding([firstPage[0]])
            embedding = res.data[0]

            // find resource by embedding
            const resources = await ctx.model.Resource.similarFindAll2(embedding, 1, SAME_DISTANCE)
            resource = resources[0]
            if (resource) {
                fileName = resource.fileName
                filePath = resource.filePath
                fileSize = resource.fileSize
                fileExt = resource.fileExt
            }
        }

        // check again
        if (!fileName) throw new Error('File name is empty')
        if (!filePath) throw new Error('File path is empty')
        if (!fileSize) throw new Error('File size is empty')
        if (!content) throw new Error('File content is empty')
        // filePath can be oss, http, local
        fileExt = fileExt || extname(filePath).replace('.', '')
        if (!fileExt) throw new Error('Can not detect file extension')

        // split pages
        const tokens = $.countTokens(content)
        let split = TOKEN_PAGE_SPLIT_L1
        if (tokens <= TOKEN_PAGE_TOTAL_L1) split = TOKEN_PAGE_SPLIT_L1
        else if (tokens <= TOKEN_PAGE_TOTAL_L2) split = TOKEN_PAGE_SPLIT_L2
        else split = TOKEN_PAGE_SPLIT_L3
        const splitPage: string[] = $.splitPage(content, split)
        if (!splitPage.length) throw new Error('Content can not be split')

        if (!resource)
            resource = await ctx.model.Resource.create({
                page: splitPage.length,
                content,
                typeId,
                userId,
                fileName,
                filePath,
                fileSize,
                fileExt,
                embedding2: embedding,
                tokens: $.countTokens(content)
            })

        if (!resource) throw new Error('Fail to create resource for embedding')
        resourceId = resource.id

        // embedding resource
        if (model === EmbedModelEnum.GPT) {
            await ctx.model.Embedding1.destroy({ where: { resourceId } })
            const res = await gpt.embedding(splitPage)
            const embeddings = res.data.map((v, i) => {
                return {
                    resourceId,
                    page: i + 1,
                    embedding: v.embedding,
                    content: splitPage[i],
                    tokens: $.countTokens(splitPage[i])
                }
            })
            resource.embeddings1 = await ctx.model.Embedding1.bulkCreate(embeddings)
        } else if (model === EmbedModelEnum.GLM) {
            await ctx.model.Embedding2.destroy({ where: { resourceId } })
            const res = await glm.embedding(splitPage)
            const embeddings = res.data.map((v, i) => {
                return {
                    resourceId,
                    page: i + 1,
                    embedding: v,
                    content: splitPage[i],
                    tokens: $.countTokens(splitPage[i])
                }
            })
            resource.embeddings2 = await ctx.model.Embedding2.bulkCreate(embeddings)
        } else throw new Error('Embedding model not found')

        return resource
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
}
