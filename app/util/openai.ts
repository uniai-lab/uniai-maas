/**
 * Utility for connecting to the GPT model API.
 *
 * @format prettier
 * @author devilyouwei
 */

import $ from '@util/util'
import { Readable } from 'stream'
import {
    GPTChatRequest,
    GPTChatResponse,
    GPTChatStreamRequest,
    GPTEmbeddingRequest,
    GPTEmbeddingResponse,
    GPTImagineRequest,
    GPTImagineResponse,
    GPTChatMessage,
    GPTImagineSize
} from '@interface/OpenAI'
import { GPTSubModel } from '@interface/Enum'

// Destructure environment variables
const { OPENAI_API, OPENAI_API_KEY } = process.env
const OPENAI_API_VERSION = 'v1'
const EMBED_MODEL = 'text-embedding-ada-002'

export default {
    /**
     * Fetches embeddings for input text.
     *
     * @param input - An array of input strings.
     * @param model - The model to use for embeddings (default: text-embedding-ada-002).
     * @returns A promise resolving to the embedding response.
     */
    async embedding(input: string[]) {
        return await $.post<GPTEmbeddingRequest, GPTEmbeddingResponse>(
            `${OPENAI_API}/${OPENAI_API_VERSION}/embeddings`,
            { model: EMBED_MODEL, input },
            { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, responseType: 'json' }
        )
    },

    /**
     * Sends messages to the GPT chat model.
     *
     * @param model - The model to use for chat (default: gpt-3.5-turbo).
     * @param messages - An array of chat messages.
     * @param stream - Whether to use stream response (default: false).
     * @param top - Top probability to sample (optional).
     * @param temperature - Temperature for sampling (optional).
     * @param maxLength - Maximum token length for response (optional).
     * @returns A promise resolving to the chat response or a stream.
     */
    async chat(
        model: GPTSubModel,
        messages: GPTChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        return await $.post<GPTChatRequest | GPTChatStreamRequest, Readable | GPTChatResponse>(
            `${OPENAI_API}/${OPENAI_API_VERSION}/chat/completions`,
            { model, messages, stream, temperature, top_p: top, max_tokens: maxLength },
            { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, responseType: stream ? 'stream' : 'json' }
        )
    },

    /**
     * Generates images based on a prompt.
     *
     * @param prompt - The prompt for image generation.
     * @param nPrompt - The negative prompt (optional).
     * @param width - Image width (default: 1024).
     * @param height - Image height (default: 1024).
     * @param n - Number of images to generate (default: 1).
     * @returns A promise resolving to the image generation response.
     */
    async imagine(prompt: string, nPrompt: string = '', width: number = 1024, height: number = 1024, n: number = 1) {
        return await $.post<GPTImagineRequest, GPTImagineResponse>(
            `${OPENAI_API}/${OPENAI_API_VERSION}/images/generations`,
            {
                prompt: `Positive prompt: ${prompt}\nNegative prompt: ${nPrompt}`,
                n,
                size: `${width}x${height}` as GPTImagineSize
            },
            { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, responseType: 'json' }
        )
    }
}
