/** @format */

import {
    ModelProvider,
    ImgModelEnum,
    EmbedModelEnum,
    AuditProvider,
    ChatModelEnum,
    ChatRoleEnum
} from '@interface/Enum'

export interface ChatMessage {
    role: ChatRoleEnum
    content: string
}

export interface ChatRequest {
    prompts: ChatMessage[]
    provider?: ModelProvider
    model?: ChatModelEnum
    stream?: boolean
    top?: number
    temperature?: number
    maxLength?: number
}

export interface QueryResourceRequest {
    prompts: ChatMessage[]
    model?: EmbedModelEnum
    resourceId?: number
    maxPage?: number
}

export interface EmbeddingRequest {
    resourceId?: number
    content?: string
    fileName?: string
    filePath?: string
    fileSize?: number
    fileExt?: string
    typeId?: number
    model?: EmbedModelEnum
}

export interface UploadRequest {
    fileName?: string
}

export interface UploadResponse {
    id: number
    content: string
    fileName: string
    filePath: string
    fileSize: number
    fileExt: string
    page: number
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
    taskId: string
    model?: ImgModelEnum
}

export interface ImgChangeRequest {
    taskId: string
    action: string
    model?: ImgModelEnum
    index?: number
}
export interface QueueRequest {
    model?: ImgModelEnum
}

export interface ChatResponse {
    content: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    model: ChatModelEnum | string
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
    model: EmbedModelEnum
}

export interface ImagineResponse {
    images: string[]
    info: string
    taskId: string
    model: ImgModelEnum
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

export interface AuditRequest {
    content: string
    provider: AuditProvider
}

export interface AuditResponse {
    flag: boolean
    data: object | null
}

export interface AIAuditResponse {
    safe?: boolean
    description?: string
}

export interface ProviderItem {
    provider: ModelProvider
    models: ChatModelEnum[]
}
