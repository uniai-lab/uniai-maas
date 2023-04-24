/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai'
import { IncomingMessage } from 'http'
import glm from '@util/glm'
import text2vec from '@util/text2vec'
import gpt from '@util/openai'
import $ from '@util/util'
import { Page } from '@model/Page'

const SAME_SIMILARITY = 0.01
const PAGE_LIMIT = 5
const MAX_TOKEN = 3500
const TOKEN_FIRST_PAGE = 800
const TOKEN_ONE_PAGE = 400

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class UniAI extends Service {
    // find related resource
    async findResource(
        prompts: ChatCompletionRequestMessage[],
        resourceId?: number,
        maxPage: number = PAGE_LIMIT,
        model: AIModelEnum = 'GLM'
    ) {
        const { ctx } = this
        let userInput: string = ''
        for (const item of prompts) userInput += `${item.content}\n`
        let pages: Page[] = []
        const where = resourceId ? { resourceId } : undefined
        if (model === 'GPT') {
            const embed = await gpt.embedding([userInput])
            pages = await ctx.model.Page.similarFindAll(embed.data[0].embedding, maxPage, where)
        }
        if (model === 'GLM') {
            const embed = await text2vec.embedding([userInput])
            pages = await ctx.model.Page.similarFindAll2(embed.data[0], maxPage, where)
        }
        if (!pages.length) throw new Error(`Resource not found: resourceId: ${resourceId}`)
        while (pages.reduce((n, p) => n + $.countTokens(p.content), 0) > MAX_TOKEN) pages.pop()
        return pages.sort((a, b) => a.id - b.id)
    }
    // add a new user
    async chat(prompts: ChatCompletionRequestMessage[], model: AIModelEnum = 'GLM', stream: boolean = false) {
        if (stream) {
            if (model === 'GPT') return (await gpt.chat(prompts, true)) as IncomingMessage
            if (model === 'GLM') return (await glm.chat(prompts, true)) as IncomingMessage
        } else {
            if (model === 'GPT') return (await gpt.chat(prompts)) as CreateChatCompletionResponse
            if (model === 'GLM') return (await glm.chat(prompts)) as GLMChatResponse
        }
    }
    // embed context
    async embedding(
        content: string,
        fileName: string,
        filePath: string,
        fileSize: number,
        author: string = '',
        model: AIModelEnum = 'GPT'
    ) {
        const { ctx } = this
        const userId = 0
        const typeId = 1

        if (model === 'GPT') {
            // check same similarity for first one page, 1000 tokens
            const p: string[] = await $.splitPage(content, TOKEN_FIRST_PAGE)
            if (!p.length) throw new Error('File content cannot be split')
            const embed = await gpt.embedding([p[0]])
            await gpt.log(ctx, userId, embed, '[AI/embedding]: check similarity for first page')
            const embedding = embed.data[0].embedding
            const result = await ctx.model.Resource.similarFindAll(embedding, 1, SAME_SIMILARITY)
            if (result.length) return result[0]

            // embedding all pages, sentence-level, 500 token per page
            const s: string[] = await $.splitPage(content, TOKEN_ONE_PAGE)
            if (!s.length) throw new Error('File content cannot be split')
            const res = await gpt.embedding(s)
            await gpt.log(ctx, 0, res, '[AI/embedding]: embedding all pages (sentences)')

            // save resource + pages
            return await ctx.model.Resource.create(
                {
                    page: s.length, // sentence num
                    typeId,
                    userId,
                    embedding,
                    filePath,
                    fileName,
                    fileSize,
                    author,
                    promptTokens: res.usage.prompt_tokens,
                    totalTokens: res.usage.total_tokens,
                    pages: res.data.map((v, i) => {
                        return {
                            page: i + 1,
                            embedding: v.embedding,
                            content: s[i],
                            length: $.countTokens(s[i])
                        }
                    })
                },
                { include: ctx.model.Page }
            )
        }
        if (model === 'GLM') {
            // check same similarity for first one page, 800 tokens
            const p: string[] = await $.splitPage(content, TOKEN_FIRST_PAGE)
            if (!p.length) throw new Error('File content cannot be split')
            const embed = await text2vec.embedding([p[0]])
            await text2vec.log(ctx, userId, embed, '[AI/embedding]: check similarity for first page')
            const embedding = embed.data[0]
            const result = await ctx.model.Resource.similarFindAll2(embedding, 1, SAME_SIMILARITY)
            if (result.length) return result[0]

            // embedding all pages, sentence-level, 400 token per page
            const s: string[] = await $.splitPage(content, TOKEN_ONE_PAGE)
            if (!s.length) throw new Error('File content cannot be split')
            const res = await text2vec.embedding(s)
            await text2vec.log(ctx, 0, res, '[AI/embedding]: embedding all pages (sentences)')

            // save resource + pages
            return await ctx.model.Resource.create(
                {
                    page: s.length, // sentence num
                    typeId,
                    userId,
                    embedding2: embedding,
                    filePath,
                    fileName,
                    fileSize,
                    author,
                    promptTokens: $.countTokens(content),
                    totalTokens: $.countTokens(content),
                    pages: res.data.map((v, i) => {
                        return {
                            page: i + 1,
                            embedding2: v,
                            content: s[i],
                            length: $.countTokens(s[i])
                        }
                    })
                },
                { include: ctx.model.Page }
            )
        }
    }
}
