/**
 * util for GLM model API connect
 *
 * @format
 * @devilyouwei
 */

import { Stream } from 'stream'
import { ChatCompletionMessage } from 'openai/resources'
import {
    GLMChatRequest,
    GLMChatResponse,
    GLMChatStreamRequest,
    GLMEmbeddingRequest,
    GLMEmbeddingResponse
} from '@interface/GLM'
import $ from '@util/util'

const API = process.env.GLM_API

export default {
    async embedding(prompt: string[]) {
        return await $.post<GLMEmbeddingRequest, GLMEmbeddingResponse>(`${API}/embedding`, { prompt })
    },
    async chat(
        messages: ChatCompletionMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        return await $.post<GLMChatRequest | GLMChatStreamRequest, Stream | GLMChatResponse>(
            `${API}/chat`,
            { messages, stream, temperature, top_p: top, max_tokens: maxLength, model: 'chatglm3-6b-32k' },
            { responseType: stream ? 'stream' : 'json' }
        )
    }
}
