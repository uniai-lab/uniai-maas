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
    CreateImageRequest,
    CreateImageRequestSizeEnum,
    ImagesResponse,
    CreateChatCompletionResponse
} from 'openai'
import $ from '@util/util'
import { Stream } from 'stream'

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
    async chat(
        messages: ChatCompletionRequestMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number,
        model: string = DEFAULT_CHAT_MODEL
    ) {
        return await $.post<ChatRequest, Stream | GPTChatResponse>(
            `${this.api}/${API_VERSION}/chat/completions`,
            { model, messages, stream, temperature, top_p: top, max_tokens: maxLength },
            {
                headers: { Authorization: `Bearer ${this.key}` },
                responseType: stream ? 'stream' : 'json'
            }
        )
    },
    async imagine(prompt: string, nPrompt: string = '', width: number = 1024, height: number = 1024, n: number = 1) {
        return await $.post<CreateImageRequest, ImagesResponse>(
            `${this.api}/${API_VERSION}/images/generations`,
            {
                prompt: `Positive prompt: ${prompt}\nNegative prompt: ${nPrompt}`,
                n,
                size: `${width}x${height}` as CreateImageRequestSizeEnum
            },
            { headers: { Authorization: `Bearer ${this.key}` } }
        )
    }
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

export type GPTChatResponse = CreateChatCompletionResponse
export type GPTChatStreamResponse = CreateChatCompletionStreamResponse
