/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai'
import glm from '@util/glm'
import gpt from '@util/openai'
import $ from '@util/util'
import { IncomingMessage } from 'http'

const SAME_SIMILARITY = 0.01

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class UniAI extends Service {
    // add a new user
    async chat(prompts: ChatCompletionRequestMessage[], model: AIModelEnum = 'GLM', stream: boolean = false) {
        if (stream) {
            if (model === 'GPT') return await gpt.chat<IncomingMessage>(prompts, true)
            if (model === 'GLM') return await glm.chat<IncomingMessage>(prompts, true)
        } else {
            if (model === 'GPT') return await gpt.chat<CreateChatCompletionResponse>(prompts)
            if (model === 'GLM') return await glm.chat<GLMChatResponse>(prompts)
        }
    }
    // embedding a resource
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
            const p: string[] = await $.splitPage(content, 800)
            if (!p.length) throw new Error('File content cannot be split')
            const embed = await gpt.embedding([p[0]])
            await gpt.log(ctx, userId, embed, '[Chat/upload]: check similarity for first page')
            const embedding = embed.data[0].embedding
            const result = await ctx.model.Resource.similarFindAll(embedding, 1, SAME_SIMILARITY)
            if (result.length) return result[0]

            // embedding all pages, sentence-level, 500 token per page
            const s: string[] = await $.splitPage(content, 400)
            s[0] = ctx.__('Main content of this document, including the title, summary, abstract, and authors') + s[0]
            if (!s.length) throw new Error('File content cannot be split')
            const res = await gpt.embedding(s)
            await gpt.log(ctx, 0, res, '[Chat/upload]: embedding all pages (sentences)')

            // save resource + pages
            const pages: any[] = res.data.map((v, i) => {
                return {
                    page: i + 1,
                    embedding: v.embedding,
                    content: s[i],
                    length: $.countTokens(s[i])
                }
            })
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
                    pages
                },
                { include: ctx.model.Page }
            )
        }
    }
}
