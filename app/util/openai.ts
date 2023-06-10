/**
 * util for GPT model API connect
 *
 * @format
 * @devilyouwei
 */

import { EggContext } from '@eggjs/tegg'
import { IncomingMessage } from 'http'
import {
    OpenAIApi,
    Configuration,
    ChatCompletionRequestMessage,
    CreateChatCompletionResponse,
    CreateEmbeddingRequestInput,
    CreateEmbeddingResponse,
    ChatCompletionResponseMessage
} from 'openai'

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
        basePath: process.env.OPENAI_PROXY || undefined
    })
)

export default {
    async log(
        ctx: EggContext,
        userId: number,
        log: CreateEmbeddingResponse | CreateChatCompletionResponse,
        message?: string
    ) {
        return await ctx.model.OpenAILog.create({
            model: log.model,
            userId,
            object: log.object,
            promptTokens: log.usage?.prompt_tokens,
            totalTokens: log.usage?.total_tokens,
            message
        })
    },
    async embedding(input: CreateEmbeddingRequestInput) {
        return (
            await openai.createEmbedding({
                model: 'text-embedding-ada-002',
                input
            })
        ).data
    },
    async chat<T = ChatCompletionResponseMessage | IncomingMessage>(
        messages: ChatCompletionRequestMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number
    ) {
        return (
            await openai.createChatCompletion(
                {
                    model: 'gpt-3.5-turbo',
                    messages,
                    stream,
                    temperature,
                    top_p: top
                },
                { responseType: stream ? 'stream' : 'json' }
            )
        ).data as T
    }
}

export interface CreateChatCompletionStreamResponse {
    id: string
    object: string
    created: number
    model: string
    choices: Array<CreateChatCompletionStreamResponseChoicesInner>
}

export interface CreateChatCompletionStreamResponseChoicesInner {
    delta: { role?: string; content?: string }
    index: number
    finish_reason: string
}
