/**
 * util for GPT model API connect
 *
 * @format
 * @devilyouwei
 */

import $ from '@util/util'
import { Stream } from 'stream'
import {
    GPTChatRequest,
    GPTChatResponse,
    GPTChatStreamRequest,
    GPTEmbeddingRequest,
    GPTEmbeddingResponse,
    GPTImagineRequest,
    GPTImagineResponse
} from '@interface/OpenAI'
import { ChatCompletionMessage } from 'openai/resources'

const API = process.env.OPENAI_API
const KEY = process.env.OPENAI_API_KEY
const API_VERSION = process.env.OPENAI_API_VERSION
const EMBEDDING_MODEL = process.env.OPENAI_DEFAULT_EMBED_MODEL
const DEFAULT_CHAT_MODEL = process.env.OPENAI_DEFAULT_CHAT_MODEL

export default {
    key: KEY,
    api: API,
    async embedding(input: string[]) {
        return await $.post<GPTEmbeddingRequest, GPTEmbeddingResponse>(
            `${this.api}/${API_VERSION}/embeddings`,
            { model: EMBEDDING_MODEL, input },
            { headers: { Authorization: `Bearer ${this.key}` }, responseType: 'json' }
        )
    },
    async chat(
        messages: ChatCompletionMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number,
        model: string = DEFAULT_CHAT_MODEL
    ) {
        return await $.post<GPTChatRequest | GPTChatStreamRequest, Stream | GPTChatResponse>(
            `${this.api}/${API_VERSION}/chat/completions`,
            { model, messages, stream, temperature, top_p: top, max_tokens: maxLength },
            { headers: { Authorization: `Bearer ${this.key}` }, responseType: stream ? 'stream' : 'json' }
        )
    },
    async imagine(prompt: string, nPrompt: string = '', width: number = 1024, height: number = 1024, n: number = 1) {
        return await $.post<GPTImagineRequest, GPTImagineResponse>(
            `${this.api}/${API_VERSION}/images/generations`,
            {
                prompt: `Positive prompt: ${prompt}\nNegative prompt: ${nPrompt}`,
                n,
                size: `${width}x${height}` as '256x256' | '512x512' | '1024x1024' | null | undefined
            },
            { headers: { Authorization: `Bearer ${this.key}` }, responseType: 'json' }
        )
    }
}
