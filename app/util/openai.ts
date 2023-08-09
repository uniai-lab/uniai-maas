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
    ChatCompletionResponseMessage
} from 'openai'
import { IncomingMessage } from 'http'
import $ from '@util/util'

const API = process.env.OPENAI_API
const KEY = process.env.OPENAI_API_KEY
const EMBEDDING_MODEL = 'text-embedding-ada-002'
const CHAT_MODEL = 'gpt-4'

export default {
    key: KEY,
    api: API,
    async embedding(input: CreateEmbeddingRequestInput) {
        return await $.post<EmbeddingRequest, CreateEmbeddingResponse>(
            `${this.api}/v1/embeddings`,
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
        maxLength?: number
    ) {
        return await $.post<ChatRequest, T>(
            `${this.api}/v1/chat/completions`,
            { model: CHAT_MODEL, messages, stream, temperature, top_p: top, max_tokens: maxLength },
            {
                headers: { Authorization: `Bearer ${this.key}` },
                responseType: stream ? 'stream' : 'json'
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
