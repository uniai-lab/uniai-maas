/** @format */

import { AIModelEnum } from '@interface/Enum'
import { ChatCompletionMessage } from 'openai/resources'

export interface ChatRequest {
    prompts: ChatCompletionMessage[]
    maxLength?: number
    top?: number
    temperature?: number
    model?: AIModelEnum
    subModel?: string
    chunk?: boolean
    stream?: boolean
}

export interface QueryResourceRequest {
    prompts: ChatCompletionMessage[]
    model?: AIModelEnum
    resourceId?: number
    maxPage?: number
    maxToken?: number
}

export interface EmbeddingRequest {
    id?: number
    content?: string
    fileName?: string
    filePath?: string
    fileSize?: number
    typeId?: number
    model?: AIModelEnum
}

export interface ImagineRequest {
    prompt: string
    negativePrompt?: string
    width?: number
    height?: number
    num?: number
    model?: AIModelEnum
}

export interface TaskRequest {
    model: AIModelEnum
    taskId: string
}

export interface ImgChangeRequest {
    model: AIModelEnum
    taskId: string
    action: string
    index?: number
}

export interface ChatResponse {
    content: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    model: string
    object: string
}

export interface QueryResourceResponse {
    content: string
    similar: number
    page: number
    resourceId: number
}

export interface EmbeddingResponse {
    id: number
    page: number
    tokens: number
}

export interface ImagineResponse {
    images: string[]
    info: string
    taskId: string
}

export interface TaskResponse {
    id: string
    progress: string
    image: string | null
    info: string
    failReason: string | null
}
