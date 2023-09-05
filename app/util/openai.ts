/**
 * util for GPT model API connect
 *
 * @format
 * @devilyouwei
 */

import {
    ChatCompletionRequestMessage,
    CreateEmbeddingRequestInput,
    CreateEmbeddingResponse,
    ChatCompletionResponseMessage,
    CreateImageRequest,
    CreateImageRequestSizeEnum,
    CreateImageRequestResponseFormatEnum,
    ImagesResponse
} from 'openai'
import { IncomingMessage } from 'http'
import $ from '@util/util'

const API = process.env.OPENAI_API
const KEY = process.env.OPENAI_API_KEY
const API_VERSION = 'v1'
const EMBEDDING_MODEL = 'text-embedding-ada-002'
const DEFAULT_CHAT_MODEL = 'gpt-3.5-turbo'

export default {
    key: KEY,
    api: API,
    async embedding(input: CreateEmbeddingRequestInput) {
        return await $.post<EmbeddingRequest, CreateEmbeddingResponse>(
            `${this.api}/${API_VERSION}/embeddings`,
            { model: EMBEDDING_MODEL, input },
            {
                headers: { Authorization: `Bearer ${this.key}` },
                responseType: 'json'
            }
        )
    },
    async chat<T = ChatCompletionResponseMessage | IncomingMessage>(
        messages: ChatCompletionRequestMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number,
        model: string = DEFAULT_CHAT_MODEL
    ) {
        return await $.post<ChatRequest, T>(
            `${this.api}/${API_VERSION}/chat/completions`,
            { model, messages, stream, temperature, top_p: top, max_tokens: maxLength },
            {
                headers: { Authorization: `Bearer ${this.key}` },
                responseType: stream ? 'stream' : 'json'
            }
        )
    },
    async text2img(
        prompt: string,
        num: number = 1,
        size: CreateImageRequestSizeEnum = '1024x1024',
        format: CreateImageRequestResponseFormatEnum = 'url'
    ) {
        return await $.post<CreateImageRequest, ImagesResponse>(
            `${this.api}/${API_VERSION}/images/generations`,
            {
                prompt,
                n: num,
                size,
                response_format: format
            },
            {
                headers: { Authorization: `Bearer ${this.key}` }
            }
        )
    }
}

export interface CreateChatCompletionStreamResponse {
    id: string
    object: string
    created: number
    model: string
    choices: CreateChatCompletionStreamResponseChoicesInner[]
}

export interface CreateChatCompletionStreamResponseChoicesInner {
    delta: { role?: string; content?: string }
    index: number
    finish_reason: string
}

interface EmbeddingRequest {
    model: string
    input: CreateEmbeddingRequestInput
}

interface ChatRequest {
    model: string
    messages: ChatCompletionRequestMessage[]
    stream: boolean
    temperature?: number
    top_p?: number
    max_tokens?: number
}
