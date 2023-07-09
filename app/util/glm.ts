/**
 * util for GLM model API connect
 *
 * @format
 * @devilyouwei
 */

import { EggContext } from '@eggjs/tegg'
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, CreateEmbeddingRequestInput } from 'openai'
import { IncomingMessage } from 'http'
import $ from '@util/util'

const API = process.env.GLM_API

export default {
    async log(ctx: EggContext, userId: number, log: GLMChatResponse | GLMEmbeddingResponse, message?: string) {
        return await ctx.model.OpenAILog.create({
            model: log.model,
            userId,
            object: log.object,
            promptTokens: log.prompt_tokens,
            totalTokens: log.total_tokens,
            message
        })
    },
    async embedding(prompt: CreateEmbeddingRequestInput) {
        return await $.post<GLMEmbeddingRequest, GLMEmbeddingResponse>(`${API}/embedding`, { prompt })
    },
    async chat<T = GLMChatRequest | IncomingMessage>(
        messages: ChatCompletionRequestMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        let prompt = ''
        const history: string[] = []
        for (const item of messages)
            if (item.role.toLowerCase() === ChatCompletionRequestMessageRoleEnum.Assistant) {
                history.push(prompt.trim()) // user message
                history.push((item.content as string).trim()) // ai message
                prompt = ''
            } else prompt += `${item.content}\n`

        const params: GLMChatRequest = { prompt: prompt.trim(), temperature, top_p: top, max_length: maxLength }
        if (history.length) params.history = [history]

        return stream
            ? await $.post<GLMChatRequest, T>(`${API}/chat-stream`, params, { responseType: 'stream' })
            : await $.post<GLMChatRequest, T>(`${API}/chat`, params, { responseType: 'json' })
    }
}

export interface GLMChatRequest {
    prompt: string
    history?: string[][]
    max_length?: number
    top_p?: number
    temperature?: number
}
export interface GLMChatResponse {
    content: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    model: string
    object: string
}
export interface GLMEmbeddingRequest {
    prompt: CreateEmbeddingRequestInput
}
export interface GLMEmbeddingResponse {
    model: string
    object: string
    data: number[][]
    prompt_tokens: number
    total_tokens: number
}
