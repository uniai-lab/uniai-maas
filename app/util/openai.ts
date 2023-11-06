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
    GPTImagineResponse,
    GPTChatMessage
} from '@interface/OpenAI'

const { OPENAI_API, OPENAI_API_KEY, OPENAI_API_VERSION, OPENAI_DEFAULT_CHAT_MODEL, OPENAI_DEFAULT_EMBED_MODEL } =
    process.env

export default {
    key: OPENAI_API_KEY,
    api: OPENAI_API,
    async embedding(input: string[]) {
        return await $.post<GPTEmbeddingRequest, GPTEmbeddingResponse>(
            `${this.api}/${OPENAI_API_VERSION}/embeddings`,
            { model: OPENAI_DEFAULT_EMBED_MODEL, input },
            { headers: { Authorization: `Bearer ${this.key}` }, responseType: 'json' }
        )
    },
    async chat(
        messages: GPTChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number,
        model: string = OPENAI_DEFAULT_CHAT_MODEL
    ) {
        return await $.post<GPTChatRequest | GPTChatStreamRequest, Stream | GPTChatResponse>(
            `${this.api}/${OPENAI_API_VERSION}/chat/completions`,
            { model, messages, stream, temperature, top_p: top, max_tokens: maxLength },
            { headers: { Authorization: `Bearer ${this.key}` }, responseType: stream ? 'stream' : 'json' }
        )
    },
    async imagine(prompt: string, nPrompt: string = '', width: number = 1024, height: number = 1024, n: number = 1) {
        return await $.post<GPTImagineRequest, GPTImagineResponse>(
            `${this.api}/${OPENAI_API_VERSION}/images/generations`,
            {
                prompt: `Positive prompt: ${prompt}\nNegative prompt: ${nPrompt}`,
                n,
                size: `${width}x${height}` as '256x256' | '512x512' | '1024x1024' | null | undefined
            },
            { headers: { Authorization: `Bearer ${this.key}` }, responseType: 'json' }
        )
    }
}
