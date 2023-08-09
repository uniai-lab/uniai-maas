/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai'
import { IncomingMessage } from 'http'
import { WhereOptions, Op } from 'sequelize'
import { PassThrough } from 'stream'
import glm, { GLMChatResponse } from '@util/glm'
import gpt, { CreateChatCompletionStreamResponse } from '@util/openai'
import { Page } from '@model/Page'
import sd from '@util/sd'
import $ from '@util/util'

const MAX_PAGE = 5
const SAME_SIMILARITY = 0.01
const TOKEN_FIRST_PAGE = 800
const TOKEN_SPLIT_PAGE = 400

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class UniAI extends Service {
    // query resource
    async queryResource(
        prompts: ChatCompletionRequestMessage[],
        resourceId: number = 0,
        maxPage: number = MAX_PAGE,
        model: AIModelEnum = 'GLM'
    ) {
        const { ctx } = this
        let query: string = ''
        for (const item of prompts) query += `${item.content}\n`

        let pages: Page[]
        let embedding: number[]
        const where: WhereOptions = {}
        if (model === 'GPT') {
            if (resourceId) {
                const resource = await ctx.model.Resource.findByPk(resourceId, { attributes: ['embedding'] })
                if (!resource) throw new Error('Resource not found')
                if (!resource.embedding) throw new Error('GPT embedding not found')
                where.resourceId = resourceId
            }
            where.embedding = { [Op.ne]: null }
            const embed = await gpt.embedding([query.trim()])
            embedding = embed.data[0].embedding
            pages = await ctx.model.Page.similarFindAll(embedding, maxPage, where)
        } else if (model === 'GLM') {
            if (resourceId) {
                const resource = await ctx.model.Resource.findByPk(resourceId, { attributes: ['embedding2'] })
                if (!resource) throw new Error('Resource not found')
                if (!resource.embedding2) throw new Error('GLM embedding not found')
                where.resourceId = resourceId
            }
            where.embedding2 = { [Op.ne]: null }
            const embed = await glm.embedding([query.trim()])
            embedding = embed.data[0]
            pages = await ctx.model.Page.similarFindAll2(embedding, maxPage, where)
        } else throw new Error('Model not found')

        return pages
            .sort((a, b) => a.id - b.id)
            .map(v => {
                const vEmbedding = (model === 'GPT' ? v.embedding : v.embedding2) || []
                return {
                    content: v.content,
                    similar: vEmbedding.length === embedding.length ? $.cosine(embedding, vEmbedding) : 0
                }
            })
    }

    // chat to model
    async chat(
        prompts: ChatCompletionRequestMessage[],
        stream: boolean = false,
        model: AIModelEnum = 'GLM',
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        if (stream) {
            if (model === 'GPT') return await gpt.chat<IncomingMessage>(prompts, true, top, temperature)
            if (model === 'GLM') return await glm.chat<IncomingMessage>(prompts, true, top, temperature, maxLength)
        } else {
            if (model === 'GPT') return await gpt.chat<CreateChatCompletionResponse>(prompts, false, top, temperature)
            if (model === 'GLM') return await glm.chat<GLMChatResponse>(prompts, false, top, temperature, maxLength)
        }
    }

    // handle chat stream
    parseStream(message: IncomingMessage, model: AIModelEnum, chunk: boolean = false) {
        this.ctx.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            Connection: 'keep-alive'
        })
        // define return data
        const res: StandardResponse<UniAIChatResponseData> = {
            status: 1,
            data: {
                content: '',
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                model: '',
                object: ''
            },
            msg: ''
        }
        // count tokens
        let count = 0
        const stream = new PassThrough()

        message.on('data', (buff: Buffer) => {
            const data = buff.toString().split(/data: (.*)/)
            for (const item of data) {
                if (model === 'GPT') {
                    const obj = $.json<CreateChatCompletionStreamResponse>(item)
                    if (obj && obj.choices[0].delta.content) {
                        if (chunk) res.data.content = obj.choices[0].delta.content
                        else res.data.content += obj.choices[0].delta.content
                        res.data.completionTokens = ++count
                        res.data.model = obj.model
                        res.data.object = obj.object
                        res.msg = 'success to get chat stream message from GPT'
                        stream.write(`data: ${JSON.stringify(res)}\n\n`)
                    }
                }
                if (model === 'GLM') {
                    const obj = $.json<GLMChatResponse>(item)
                    if (obj && obj.content) {
                        if (chunk) res.data.content = obj.content
                        else res.data.content += obj.content
                        res.data.completionTokens = ++count
                        res.data.model = obj.model
                        res.data.object = obj.object
                        res.msg = 'success to get chat stream message from GLM'
                        stream.write(`data: ${JSON.stringify(res)}\n\n`)
                    }
                }
            }
        })
        message.on('error', e => stream.end(e))
        message.on('end', () => stream.end())
        message.on('close', () => stream.destroy())
        return stream
    }

    // embed content
    async embedding(
        content: string,
        fileName: string,
        filePath: string,
        fileSize: number,
        model: AIModelEnum = 'GLM',
        id: number = 0
    ) {
        const { ctx } = this
        const userId = 0
        const typeId = 1
        const firstPage: string[] = $.splitPage(content, TOKEN_FIRST_PAGE)
        const splitPage: string[] = $.splitPage(content, TOKEN_SPLIT_PAGE)
        if (!firstPage.length || !splitPage.length) throw new Error('File content cannot be split')

        const value: {
            page: number
            typeId: number
            userId: number
            embedding: number[] | null
            embedding2: number[] | null
            filePath: string
            fileName: string
            fileSize: number
            promptTokens: number
            totalTokens: number
            pages: {
                page: number
                embedding: number[] | null
                embedding2: number[] | null
                content: string
                length: number
            }[]
        } = {
            page: splitPage.length,
            typeId,
            userId,
            fileName,
            filePath,
            fileSize,
            embedding: null,
            embedding2: null,
            promptTokens: $.countTokens(content),
            totalTokens: $.countTokens(content),
            pages: []
        }

        if (model === 'GPT') {
            const first = await gpt.embedding([firstPage[0]])
            value.embedding = first.data[0].embedding

            // check similarity
            const check = await ctx.model.Resource.similarFindAll(value.embedding, 1, SAME_SIMILARITY)
            if (check.length) return check[0]

            const res = await gpt.embedding(splitPage)
            res.data.map((v, i) => {
                value.pages.push({
                    page: i + 1,
                    embedding: v.embedding,
                    embedding2: null,
                    content: splitPage[i],
                    length: $.countTokens(splitPage[i])
                })
            })
        } else if (model === 'GLM') {
            const first = await glm.embedding([firstPage[0]])
            value.embedding2 = first.data[0]

            // check similarity
            const check = await ctx.model.Resource.similarFindAll2(value.embedding2, 1, SAME_SIMILARITY)
            if (check.length) return check[0]

            const res = await glm.embedding(splitPage)
            res.data.map((v, i) => {
                value.pages.push({
                    page: i + 1,
                    embedding: null,
                    embedding2: v,
                    content: splitPage[i],
                    length: $.countTokens(splitPage[i])
                })
            })
        } else throw new Error('Model not found')

        let resource = await ctx.model.Resource.findOne({ where: { id, userId }, include: ctx.model.Page })
        if (!resource) resource = await ctx.model.Resource.create(value, { include: ctx.model.Page })
        else {
            resource.embedding = value.embedding || resource.embedding
            resource.embedding2 = value.embedding2 || resource.embedding2
            await resource.save()
            for (const i in value.pages) {
                const p = resource.pages[i]
                const v = value.pages[i]
                if (p) {
                    p.embedding = v.embedding || p.embedding
                    p.embedding2 = v.embedding2 || p.embedding2
                    await p.save()
                } else {
                    await ctx.model.Page.create({ resourceId: resource.id, ...v })
                }
            }
        }
        return resource
    }
    async txt2img(prompt: string, nPrompt: string, width: number, height: number) {
        return await sd.txt2img(prompt, nPrompt, width, height)
    }
    async progress() {
        return await sd.progress()
    }
}
