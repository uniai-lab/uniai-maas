/**
 * util for GLM model API connect
 *
 * @format
 * @devilyouwei
 */

import { Stream } from 'stream'
import {
    GLMChatRequest,
    GLMChatResponse,
    GLMEmbeddingRequest,
    GLMEmbeddingResponse,
    GLMChatMessage
} from '@interface/GLM'
import $ from '@util/util'

const API = process.env.GLM_API

export default {
    async embedding(prompt: string[]) {
        return await $.post<GLMEmbeddingRequest, GLMEmbeddingResponse>(`${API}/embedding`, { prompt })
    },
    async chat(
        messages: GLMChatMessage[],
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
