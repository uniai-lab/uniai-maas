/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { ChatCompletionRequestMessage } from 'openai'
import { WhereOptions, Op } from 'sequelize'
import { PassThrough, Stream } from 'stream'
import { createParser } from 'eventsource-parser'
import { Page } from '@model/Page'
import glm, { GLMChatResponse } from '@util/glm'
import gpt, { GPTChatStreamResponse } from '@util/openai'
import fly, { SPKChatResponse } from '@util/fly'
import sd from '@util/sd'
import mj from '@util/mj'
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
        maxLength?: number,
        subModel?: string
    ) {
        if (stream) {
            if (model === 'GPT') return await gpt.chat(prompts, true, top, temperature, maxLength, subModel)
            else if (model === 'GLM') return await glm.chat(prompts, true, top, temperature, maxLength)
            else if (model === 'SPARK') return await fly.chat(prompts, true, top, temperature, maxLength, subModel)
            else throw new Error('Model for chat not found')
        } else {
            if (model === 'GPT') return await gpt.chat(prompts, false, top, temperature, maxLength, subModel)
            else if (model === 'GLM') return await glm.chat(prompts, false, top, temperature, maxLength)
            else if (model === 'SPARK') return await fly.chat(prompts, false, top, temperature, maxLength, subModel)
            else throw new Error('Chat model not found')
        }
    }

    // handle chat stream
    parseSSE(message: Stream, model: AIModelEnum, chunk: boolean = false, format: boolean = true) {
        this.ctx.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            Connection: 'keep-alive'
        })
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
                    if (obj && obj.choices[0].delta.content) {
                        if (chunk) res.data.content = obj.choices[0].delta.content
                        else res.data.content += obj.choices[0].delta.content
                        res.data.completionTokens = count
                        res.data.model = obj.model
                        res.data.object = obj.object
                    }
                }
                if (model === 'GLM') {
                    const obj = $.json<GLMChatResponse>(event.data)
                    if (obj && obj.content) {
                        if (chunk) res.data.content = obj.content
                        else res.data.content += obj.content
                        res.data.completionTokens = obj.completion_tokens
                        res.data.promptTokens = obj.prompt_tokens
                        res.data.totalTokens = obj.total_tokens
                        res.data.model = obj.model
                        res.data.object = obj.object
                    }
                }
                if (model === 'SPARK') {
                    const obj = $.json<SPKChatResponse>(event.data)
                    if (obj && obj.payload.choices.text[0].content) {
                        const { payload } = obj
                        if (chunk) res.data.content = payload.choices.text[0].content
                        else res.data.content += payload.choices.text[0].content
                        res.data.completionTokens = payload.usage?.text.completion_tokens
                        res.data.promptTokens = payload.usage?.text.prompt_tokens
                        res.data.totalTokens = payload.usage?.text.total_tokens
                        res.data.model = payload.model
                        res.data.object = payload.object
                    }
                }
                if (format) stream.write(`data: ${JSON.stringify(res)}\n\n`)
                else stream.write(JSON.stringify(res))
            }
        })

        message.on('data', (buff: Buffer) => parser.feed(buff.toString()))
        message.on('error', e => stream.destroy(e))
        message.on('end', () => stream.end())
        message.on('close', () => stream.destroy())
        return stream
    }

    // create embedding
    async createEmbedding(
        content: string,
        fileName: string,
        filePath: string,
        fileSize: number,
        model: AIModelEnum = 'GLM',
        userId: number = 0,
        typeId: number = 1
    ) {
        const { ctx } = this

        // split pages
        const firstPage: string[] = $.splitPage(content, TOKEN_FIRST_PAGE)
        const splitPage: string[] = $.splitPage(content, TOKEN_SPLIT_PAGE)
        if (!firstPage.length || !splitPage.length) throw new Error('Content cannot be split')

        let embedding: null | number[] = null
        let embedding2: null | number[] = null
        const pages: {
            page: number
            embedding?: number[]
            embedding2?: number[]
            content: string
            tokens: number
        }[] = []

        if (model === 'GPT') {
            const first = await gpt.embedding([firstPage[0]])
            embedding = first.data[0].embedding

            // check similarity
            const check = await ctx.model.Resource.similarFindAll(embedding, 1, SAME_SIMILARITY)
            if (check.length) return check[0]

            const res = await gpt.embedding(splitPage)
            res.data.map((v, i) => {
                pages.push({
                    page: i + 1,
                    embedding: v.embedding,
                    content: splitPage[i],
                    tokens: $.countTokens(splitPage[i])
                })
            })
        } else if (model === 'GLM') {
            const first = await glm.embedding([firstPage[0]])
            embedding2 = first.data[0]

            // check similarity
            const check = await ctx.model.Resource.similarFindAll2(embedding2, 1, SAME_SIMILARITY)
            if (check.length) return check[0]

            const res = await glm.embedding(splitPage)
            res.data.map((v, i) => {
                pages.push({
                    page: i + 1,
                    embedding2: v,
                    content: splitPage[i],
                    tokens: $.countTokens(splitPage[i])
                })
            })
        } else throw new Error('Embedding model not found')

        return await ctx.model.Resource.create(
            {
                page: splitPage.length,
                content,
                typeId,
                userId,
                fileName,
                filePath,
                fileSize,
                embedding,
                embedding2,
                tokens: $.countTokens(content),
                pages
            },
            { include: ctx.model.Page }
        )
    }

    // update embedding
    async updateEmbedding(id: number, model: AIModelEnum = 'GLM', userId: number = 0) {
        const { ctx } = this

        // check resource is all right
        const attributes = ['id', 'embedding', 'embedding2', 'content', 'tokens', 'page']
        const resource = await ctx.model.Resource.findOne({
            where: { id, userId },
            attributes,
            include: { model: ctx.model.Page, attributes }
        })
        if (!resource) throw new Error('Updating resource not found')

        // split content
        const content = resource.content
        const firstPage: string[] = $.splitPage(content, TOKEN_FIRST_PAGE)
        const splitPage: string[] = $.splitPage(content, TOKEN_SPLIT_PAGE)
        if (!firstPage.length || !splitPage.length) throw new Error('Content cannot be split')

        // number of pages changed
        if (resource.pages.length !== splitPage.length) {
            // remove old pages
            await ctx.model.Page.destroy({ where: { resourceId: resource.id } })
            const resourceId = resource.id
            // create new pages
            resource.pages = await ctx.model.Page.bulkCreate(
                splitPage.map((v, i) => {
                    return { resourceId, page: i + 1, content: v, tokens: $.countTokens(v) }
                })
            )
            resource.page = splitPage.length
            resource.embedding = null
            resource.embedding2 = null
        }

        // update embedding
        if (model === 'GPT') {
            // embedding first page
            const first = await gpt.embedding([firstPage[0]])
            resource.embedding = first.data[0].embedding

            // check similarity
            const check = await ctx.model.Resource.similarFindAll(resource.embedding, 1, SAME_SIMILARITY)
            if (check.length) return check[0]

            // embedding all pages
            const res = await gpt.embedding(splitPage)
            res.data.map((v, i) => (resource.pages[i].embedding = v.embedding))
        } else if (model === 'GLM') {
            // embedding first page
            const first = await glm.embedding([firstPage[0]])
            resource.embedding2 = first.data[0]

            // check similarity
            const check = await ctx.model.Resource.similarFindAll2(resource.embedding2, 1, SAME_SIMILARITY)
            if (check.length) return check[0]

            // embedding all pages
            const res = await glm.embedding(splitPage)
            res.data.map((v, i) => (resource.pages[i].embedding2 = v))
        } else throw new Error('Embedding model not found')

        for (const item of resource.pages) await item.save()
        return await resource.save()
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
