/**
 * Utility for connecting to the GPT model API.
 *
 * @format prettier
 * @author devilyouwei
 */

import $ from '@util/util'
import { PassThrough, Readable } from 'stream'
import {
    GPTChatRequest,
    GPTChatResponse,
    GPTChatStreamRequest,
    GPTEmbeddingRequest,
    GPTEmbeddingResponse,
    GPTImagineRequest,
    GPTImagineResponse,
    GPTChatMessage,
    GPTImagineSize,
    GPTChatStreamResponse
} from '@interface/OpenAI'
import { OpenAIChatModel, OpenAIEmbedModel } from '@interface/Enum'
import { createParser } from 'eventsource-parser'
import { ChatResponse } from '@interface/controller/UniAI'

// Destructure environment variables
const { OPENAI_API, OPENAI_KEY } = process.env
const API_VERSION = 'v1'

export default {
    /**
     * Fetches embeddings for input text.
     *
     * @param input - An array of input strings.
     * @param model - The model to use for embeddings (default: text-embedding-ada-002).
     * @returns A promise resolving to the embedding response.
     */
    async embedding(input: string[], model: OpenAIEmbedModel = OpenAIEmbedModel.ADA2) {
        return await $.post<GPTEmbeddingRequest, GPTEmbeddingResponse>(
            `${OPENAI_API}/${API_VERSION}/embeddings`,
            { model, input },
            { headers: { Authorization: `Bearer ${OPENAI_KEY}` }, responseType: 'json' }
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
        model: OpenAIChatModel = OpenAIChatModel.GPT3,
        messages: GPTChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        const res = await $.post<GPTChatRequest | GPTChatStreamRequest, Readable | GPTChatResponse>(
            `${OPENAI_API}/${API_VERSION}/chat/completions`,
            { model, messages, stream, temperature, top_p: top, max_tokens: maxLength },
            { headers: { Authorization: `Bearer ${OPENAI_KEY}` }, responseType: stream ? 'stream' : 'json' }
        )
        const data: ChatResponse = {
            content: '',
            model,
            object: '',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        }
        if (res instanceof Readable) {
            const output = new PassThrough()
            const parser = createParser(e => {
                if (e.type === 'event') {
                    const obj = $.json<GPTChatStreamResponse>(e.data)
                    if (obj?.choices[0].delta?.content) {
                        data.content = obj.choices[0].delta.content
                        data.model = obj.model
                        data.object = obj.object
                        output.write(`data: ${JSON.stringify(data)}\n\n`)
                    }
                }
            })
            res.on('data', (buff: Buffer) => parser.feed(buff.toString('utf-8')))
            res.on('error', e => output.destroy(e))
            res.on('end', () => output.end())
            res.on('close', () => parser.reset())
            return output as Readable
        } else {
            data.content = res.choices[0].message.content || ''
            data.model = res.model
            data.object = res.object
            data.promptTokens = res.usage?.prompt_tokens || 0
            data.completionTokens = res.usage?.completion_tokens || 0
            data.totalTokens = res.usage?.total_tokens || 0
            return data
        }
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
            `${OPENAI_API}/${API_VERSION}/images/generations`,
            {
                prompt: `Positive prompt: ${prompt}\nNegative prompt: ${nPrompt}`,
                n,
                size: `${width}x${height}` as GPTImagineSize
            },
            { headers: { Authorization: `Bearer ${OPENAI_KEY}` }, responseType: 'json' }
        )
    }
}
