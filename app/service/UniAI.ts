/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { ChatCompletionRequestMessage } from 'openai'
import { PassThrough, Stream } from 'stream'
import { createParser } from 'eventsource-parser'
import glm, { GLMChatResponse } from '@util/glm'
import gpt, { GPTChatStreamResponse } from '@util/openai'
import fly, { SPKChatResponse } from '@util/fly'
import sd from '@util/sd'
import mj from '@util/mj'
import $ from '@util/util'
import { Resource } from '@model/Resource'

const MAX_PAGE = 6
const MAX_TOKEN = 4096
const SAME_SIMILARITY = 0.01
const TOKEN_PAGE_FIRST = 768
const TOKEN_PAGE_SPLIT_L1 = 2048
const TOKEN_PAGE_SPLIT_L2 = 1024
const TOKEN_PAGE_SPLIT_L3 = 512
const TOKEN_PAGE_TOTAL_L1 = TOKEN_PAGE_SPLIT_L1 * 1
const TOKEN_PAGE_TOTAL_L2 = TOKEN_PAGE_SPLIT_L2 * 8

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class UniAI extends Service {
    // query resource
    async queryResource(
        prompts: ChatCompletionRequestMessage[],
        resourceId?: number,
        model: AIModelEnum = 'GLM',
        maxPage: number = MAX_PAGE,
        maxToken: number = MAX_TOKEN
    ) {
        const { ctx } = this

        const where: { resourceId?: number } = {}
        // check resource
        if (resourceId) {
            const resource = await ctx.model.Resource.count({ where: { id: resourceId } })
            if (!resource) throw new Error('Resource not found')
            where.resourceId = resourceId
            // check embeddings exist
            let count = 0
            if (model === 'GPT') count = await ctx.model.Embedding1.count({ where })
            else if (model === 'GLM') count = await ctx.model.Embedding2.count({ where })
            // create embeddings
            if (!count) await this.embedding(model, resourceId)
        }

        const pages: { content: string; similar: number; page: number; resourceId: number }[] = []

        for (const item of prompts) {
            const query = (item.content || '').trim()
            if (model === 'GPT') {
                const embed = await gpt.embedding([query])
                const embedding = embed.data[0].embedding
                const res = await ctx.model.Embedding1.similarFindAll(embedding, maxPage, where)
                while (res.reduce((n, p) => n + $.countTokens(p.content), 0) > maxToken) res.pop()
                for (const item of resourceId ? res.sort((a, b) => a.page - b.page) : res)
                    pages.push({
                        resourceId: item.resourceId,
                        page: item.page,
                        content: item.content,
                        similar: $.cosine(embedding, item.embedding as number[])
                    })
            } else if (model === 'GLM') {
                const embed = await glm.embedding([query])
                const embedding = embed.data[0]
                const res = await ctx.model.Embedding2.similarFindAll(embedding, maxPage, where)
                while (res.reduce((n, p) => n + $.countTokens(p.content), 0) > MAX_TOKEN) res.pop()
                for (const item of resourceId ? res.sort((a, b) => a.page - b.page) : res)
                    pages.push({
                        resourceId: item.resourceId,
                        page: item.page,
                        content: item.content,
                        similar: $.cosine(embedding, item.embedding as number[])
                    })
            } else throw new Error('Embedding model not found')
        }

        return pages
    }

    // chat to model
    async chat(
        prompts: ChatCompletionRequestMessage[],
        stream: boolean = false,
        model: AIModelEnum = 'GLM',
        top?: number,
        temperature?: number,
        maxLength?: number,
        subModel?: string
    ) {
        if (model === 'GPT') return await gpt.chat(prompts, stream, top, temperature, maxLength, subModel)
        else if (model === 'GLM') return await glm.chat(prompts, stream, top, temperature, maxLength)
        else if (model === 'SPARK') return await fly.chat(prompts, stream, top, temperature, maxLength, subModel)
        else throw new Error('Chat model not found')
    }

    // handle chat stream
    parseSSE(message: Stream, model: AIModelEnum = 'GLM', chunk: boolean = false) {
        // define return data
        const res: StandardResponse<UniAIChatResponseData> = {
            status: 1,
            data: { content: '', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            msg: 'success to get chat stream message'
        }
        // count tokens
        let count = 0
        const stream = new PassThrough()
        const parser = createParser(event => {
            if (event.type === 'event') {
                count++
                if (model === 'GPT') {
                    const obj = $.json<GPTChatStreamResponse>(event.data)
                    if (obj?.choices[0].delta?.content) {
                        if (chunk) res.data.content = obj.choices[0].delta.content
                        else res.data.content += obj.choices[0].delta.content
                        res.data.completionTokens = count
                        res.data.model = obj.model
                        res.data.object = obj.object
                        stream.write(`data: ${JSON.stringify(res)}\n\n`)
                    }
                }
                if (model === 'GLM') {
                    const obj = $.json<GLMChatResponse>(event.data)
                    if (obj?.content) {
                        if (chunk) res.data.content = obj.content
                        else res.data.content += obj.content
                        res.data.completionTokens = obj.completion_tokens
                        res.data.promptTokens = obj.prompt_tokens
                        res.data.totalTokens = obj.total_tokens
                        res.data.model = obj.model
                        res.data.object = obj.object
                        stream.write(`data: ${JSON.stringify(res)}\n\n`)
                    }
                }
                if (model === 'SPARK') {
                    const obj = $.json<SPKChatResponse>(event.data)
                    if (obj?.payload.choices.text[0].content) {
                        const { payload } = obj
                        if (chunk) res.data.content = payload.choices.text[0].content
                        else res.data.content += payload.choices.text[0].content
                        res.data.completionTokens = payload.usage?.text.completion_tokens
                        res.data.promptTokens = payload.usage?.text.prompt_tokens
                        res.data.totalTokens = payload.usage?.text.total_tokens
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
        return stream
    }

    // create embedding
    async embedding(
        model: AIModelEnum = 'GLM',
        resourceId?: number,
        content?: string,
        fileName?: string,
        filePath?: string,
        fileSize?: number,
        userId: number = 0,
        typeId: number = 1
    ) {
        const { ctx } = this
        let resource: Resource | null = null

        // find by resource id
        if (resourceId) {
            resource = await ctx.model.Resource.findByPk(resourceId)
            if (!resource) throw new Error('Can not find existed resource by id')
            content = resource.content
            fileName = resource.fileName
            filePath = resource.filePath
            fileSize = resource.fileSize
        }
        if (!content) throw new Error('File content is empty')
        if (!fileName) throw new Error('File name is empty')
        if (!filePath) throw new Error('File path is empty')
        if (!fileSize) throw new Error('File size is empty')

        // split first page
        const firstPage: string[] = $.splitPage(content, TOKEN_PAGE_FIRST)
        if (!firstPage[0]) throw new Error('First page can not be split')

        // embedding first page
        const res = await glm.embedding([firstPage[0]])
        const embedding = res.data[0]

        // find by embedding similarity
        if (!resourceId) {
            const resources = await ctx.model.Resource.similarFindAll2(embedding, 1, SAME_SIMILARITY)
            resource = resources[0]
        }

        // split pages
        const tokens = $.countTokens(content)
        let split = TOKEN_PAGE_SPLIT_L1
        if (tokens <= TOKEN_PAGE_TOTAL_L1) split = TOKEN_PAGE_SPLIT_L1
        else if (tokens <= TOKEN_PAGE_TOTAL_L2) split = TOKEN_PAGE_SPLIT_L2
        else split = TOKEN_PAGE_SPLIT_L3
        const splitPage: string[] = $.splitPage(content, split)
        if (!splitPage.length) throw new Error('Content can not be split')

        if (resource) {
            resource.embedding2 = embedding
            resource.page = splitPage.length
            await resource.save()
        } else {
            resource = await ctx.model.Resource.create({
                page: splitPage.length,
                content,
                typeId,
                userId,
                fileName,
                filePath,
                fileSize,
                embedding2: embedding,
                tokens: $.countTokens(content)
            })
        }
        if (!resource) throw new Error('Fail to create embed resource')
        resourceId = resource.id

        const where = { resourceId }
        if (model === 'GPT') {
            await ctx.model.Embedding1.destroy({ where })
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
        } else if (model === 'GLM') {
            await ctx.model.Embedding2.destroy({ where })
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
        num: number = 1,
        width: number = 1024,
        height: number = 1024,
        model: AIModelEnum = 'MJ'
    ) {
        if (model === 'SD') return sd.imagine(prompt, nPrompt, width, height, num)
        else if (model === 'DALLE') return gpt.imagine(prompt, nPrompt, width, height, num)
        else if (model === 'MJ') return mj.imagine(prompt, nPrompt, width, height)
        else throw new Error('Image imagine model not found')
    }

    task(id: string, model: AIModelEnum = 'MJ') {
        if (model === 'MJ') return mj.task(id)
        else if (model === 'SD') return sd.task()
        else throw new Error('Image task model not found')
    }

    change(id: string, action: string, index?: number, model: AIModelEnum = 'MJ') {
        if (model === 'MJ') return mj.change(id, action as MJTaskEnum, index)
        else throw new Error('Image change model not found')
    }

    queue(model: AIModelEnum = 'MJ') {
        if (model === 'MJ') return mj.queue()
        else throw new Error('Image queue model not found')
    }
}
