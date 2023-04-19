/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Inject } from '@eggjs/tegg'
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai'
import isJSON from '@stdlib/assert-is-json'
import { createParser, EventSourceParser } from 'eventsource-parser'
import { PassThrough } from 'stream'
import { IncomingMessage } from 'http'

@HTTPController({ path: '/ai' })
export default class UniAI {
    @Inject()
    logger: EggContext

    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: EggContext, @HTTPBody() params: UniAIChatPost) {
        try {
            const prompts = params.prompts as ChatCompletionRequestMessage[]
            const model = params.model || 'GLM'
            if (!params.prompts.length) throw new Error('Empty prompts')
            // chat to GPT
            if (model === 'GPT') {
                const res = (await ctx.service.uniAI.chat(prompts, model)) as CreateChatCompletionResponse
                if (res.choices[0].message?.content)
                    ctx.service.res.success('Success to chat to GPT', {
                        content: res.choices[0].message.content,
                        promptTokens: res.usage?.prompt_tokens,
                        completionTokens: res.usage?.completion_tokens,
                        totalTokens: res.usage?.total_tokens,
                        model: res.model,
                        object: res.object,
                        prompts: params.prompts
                    } as UniAIChatResponseData)
                else throw new Error('Error to chat to GPT')
            }
            // chat to GLM
            if (params.model === 'GLM') {
                const res = (await ctx.service.uniAI.chat(prompts, model)) as GLMChatResponse
                if (res.content)
                    ctx.service.res.success('Success to chat to GLM', {
                        content: res.content,
                        promptTokens: res.prompt_tokens,
                        completionTokens: res.completion_tokens,
                        totalTokens: res.total_tokens,
                        model: res.model,
                        object: res.object,
                        prompts: params.prompts
                    } as UniAIChatResponseData)
                else throw new Error('Error to chat to GLM')
            }
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chatStream(@Context() ctx: EggContext, @HTTPBody() params: UniAIChatPost) {
        try {
            ctx.set({
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            })
            const prompts = params.prompts as ChatCompletionRequestMessage[]
            const model = params.model || 'GLM'
            if (!params.prompts.length) throw new Error('Empty prompts')

            const res = (await ctx.service.uniAI.chat(prompts, model, true)) as IncomingMessage

            const stream = new PassThrough()
            const response: StandardResponse<UniAIChatResponseData> = {
                status: 1,
                data: {
                    content: '',
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    model: '',
                    object: ''
                },
                msg: 'success to get chat stream message'
            }

            let parser: EventSourceParser
            // chat to GPT
            if (model === 'GPT') {
                parser = createParser(e => {
                    if (e.type === 'event')
                        if (isJSON(e.data)) {
                            const data = JSON.parse(e.data) as CreateChatCompletionStreamResponse
                            response.data.content += data.choices[0].delta.content || ''
                            response.data.model = data.model
                            response.data.object = data.object
                            if (response.data.content) stream.write(`data: ${JSON.stringify(response)}\n\n`)
                        }
                })
            }
            // chat to GLM
            if (model === 'GLM') {
                parser = createParser(e => {
                    if (e.type === 'event') {
                        if (isJSON(e.data)) {
                            const data = JSON.parse(e.data) as GLMChatResponse
                            response.data.content = data.content
                            response.data.promptTokens = data.prompt_tokens
                            response.data.completionTokens = data.completion_tokens
                            response.data.totalTokens = data.total_tokens
                            response.data.model = data.model
                            response.data.object = data.object
                            if (response.data.content) stream.write(`data: ${JSON.stringify(response)}\n\n`)
                        }
                    }
                })
            }
            res.on('data', (buff: Buffer) => parser.feed(buff.toString('utf8')))
            res.on('end', () => stream.end())
            res.on('error', () => stream.end())
            ctx.body = stream
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/embedding-text', method: HTTPMethodEnum.POST })
    async embedding(@Context() ctx: EggContext, @HTTPBody() params: UniAIEmbeddingPost) {
        try {
            if (!params.content) throw new Error('content is null')
            if (!params.fileName) throw new Error('file name is null')
            if (!params.filePath) throw new Error('file path is null')
            if (!params.fileSize) throw new Error('file size is not valid')

            const res = await ctx.service.uniAI.embedding(
                params.content,
                params.fileName,
                params.filePath,
                params.fileSize,
                params.author,
                params.model
            )
            if (!res) throw new Error('Fail to embed text')
            const data: UniAIEmbeddingResponseData = {
                id: res.id,
                promptTokens: res.promptTokens,
                totalTokens: res.totalTokens,
                page: res.page
            }
            ctx.service.res.success('Success to embed text', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
