/**
 * util for GLM model API connect
 *
 * @format
 * @devilyouwei
 */

import {
    ChatCompletionRequestMessage,
    ChatCompletionResponseMessage,
    CreateChatCompletionResponse,
    CreateEmbeddingRequestInput
} from 'openai'
import { Stream } from 'stream'
import $ from '@util/util'

const API = process.env.GLM_API

export default {
    async embedding(prompt: CreateEmbeddingRequestInput) {
        return await $.post<GLMEmbeddingRequest, GLMEmbeddingResponse>(`${API}/embedding`, { prompt })
    },
    async chat(
        messages: ChatCompletionRequestMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        return await $.post<GLMChatRequest, Stream | GLMChatResponse>(
            `${API}/chat`,
            { messages, stream, temperature, top_p: top, max_tokens: maxLength },
            { responseType: stream ? 'stream' : 'json' }
        )
    }
}

type GLMEmbeddingRequest = { prompt: CreateEmbeddingRequestInput }
export type GLMEmbeddingResponse = { model: string; object: string; data: number[][] }

type GLMChatRequest = {
    messages: ChatCompletionRequestMessage[]
    temperature?: number
    top_p?: number
    max_tokens?: number
    stream?: boolean
    chunk?: boolean
    stop_token_ids?: number[]
    repetition_penalty?: number
    return_function_call?: boolean
}

type GLMChatStreamResponseChoicesInner = {
    index?: number
    delta?: ChatCompletionResponseMessage
    finish_reason?: string
}

export type GLMChatResponse = CreateChatCompletionResponse
export type GLMChatStreamResponse = {
    id: string
    object: string
    created: number
    model: string
    choices: Array<GLMChatStreamResponseChoicesInner>
}
