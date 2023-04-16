/** @format */

import { EggContext } from '@eggjs/tegg'
import { ResponseType } from 'axios'
import {
    OpenAIApi,
    Configuration,
    ChatCompletionRequestMessage,
    CreateChatCompletionResponse,
    CreateEmbeddingRequestInput,
    CreateEmbeddingResponse
} from 'openai'

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
        basePath: process.env.OPENAI_PROXY
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
    async chat<T>(messages: ChatCompletionRequestMessage[], stream: boolean = false) {
        const responseType: ResponseType = stream ? 'stream' : 'json'
        return (
            await openai.createChatCompletion(
                {
                    model: 'gpt-3.5-turbo',
                    messages,
                    stream
                },
                { responseType }
            )
        ).data as T
    },
    async listModels() {
        return (await openai.listModels()).data
    }
}
