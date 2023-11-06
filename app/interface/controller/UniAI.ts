/** @format */

import { AIModelEnum, ChatModelEnum, ImgModelEnum } from '@interface/Enum'
import { GLMChatMessage } from '@interface/GLM'
import { GPTChatMessage } from '@interface/OpenAI'
import { SPKChatMessage } from '@interface/Spark'

export type ChatMessage = GPTChatMessage | GLMChatMessage | SPKChatMessage

export interface ChatRequest {
    prompts: ChatMessage[]
    maxLength?: number
    top?: number
    temperature?: number
    model?: ChatModelEnum
    subModel?: string
    chunk?: boolean
    stream?: boolean
}

export interface QueryResourceRequest {
    prompts: ChatMessage[]
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
    model?: ImgModelEnum
}

export interface TaskRequest {
    model: ImgModelEnum
    taskId: string
}

export interface ImgChangeRequest {
    model: ImgModelEnum
    taskId: string
    action: string
    index?: number
}
export interface QueueRequest {
    model: ImgModelEnum
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

export interface ResourcePage {
    id: number
    content: string
    similar: number
    page: number
    resourceId: number
}
