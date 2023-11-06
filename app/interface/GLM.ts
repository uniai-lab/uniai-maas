/** @format */

import { ChatCompletion, ChatCompletionChunk } from 'openai/resources'
import { GLMChatRoleEnum } from '@interface/Enum'

export interface GLMChatResponse extends ChatCompletion {}
export interface GLMChatStreamResponse extends ChatCompletionChunk {}

export interface GLMEmbeddingRequest {
    prompt: string[]
}
export interface GLMEmbeddingResponse {
    model: string
    object: string
    data: number[][]
}

export interface GLMChatRequest {
    messages: GLMChatMessage[]
    temperature?: number | null
    // model?: (string & {}) | 'chatglm3-6b-32k'
    top_p?: number | null
    max_tokens?: number | null
    stop?: string | null | string[]
    stream?: boolean
    chunk?: boolean
    stop_token_ids?: number[] | null
    repetition_penalty?: number
    return_function_call?: boolean
}

export interface GLMChatMessage {
    role: GLMChatRoleEnum
    content: string | null
    metadata?: string | null
    tools?: {}[] | null
}
