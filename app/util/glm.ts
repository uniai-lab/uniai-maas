/**
 * util for GLM model API connect
 *
 * @format
 * @devilyouwei
 */

import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, CreateEmbeddingRequestInput } from 'openai'
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
        let prompt = ''
        const history: string[][] = []
        for (const { role, content } of messages)
            if (role.toLowerCase() === ChatCompletionRequestMessageRoleEnum.System) history.push([content || '', 'yes'])
            else if (role.toLowerCase() === ChatCompletionRequestMessageRoleEnum.User) prompt += `${content}\n`
            else {
                history.push([prompt.trim(), content || ''])
                prompt = ''
            }

        const params: GLMChatRequest = {
            prompt: prompt.trim(),
            history,
            temperature,
            top_p: top,
            max_length: maxLength
        }

        return stream
            ? await $.post<GLMChatRequest, Stream>(`${API}/chat-stream`, params, { responseType: 'stream' })
            : await $.post<GLMChatRequest, GLMChatResponse>(`${API}/chat`, params, { responseType: 'json' })
    }
}

interface GLMChatRequest {
    prompt: string
    history?: string[][]
    max_length?: number
    top_p?: number
    temperature?: number
}
interface GLMEmbeddingRequest {
    prompt: CreateEmbeddingRequestInput
}
export interface GLMChatResponse {
    content: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    model: string
    object: string
}
export interface GLMEmbeddingResponse {
    model: string
    object: string
    data: number[][]
    prompt_tokens: number
    total_tokens: number
}
