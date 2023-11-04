/** @format */

import {
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionCreateParamsStreaming
} from 'openai/resources'

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

export interface GLMChatRequest extends ChatCompletionCreateParamsNonStreaming {}
export interface GLMChatStreamRequest extends ChatCompletionCreateParamsStreaming {}
