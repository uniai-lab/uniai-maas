/** @format */

import { AuditProvider } from '@interface/Enum'
import {
    ChatMessage,
    ChatModel,
    ChatModelProvider,
    EmbedModel,
    EmbedModelProvider,
    ImagineModel,
    ImagineModelProvider,
    ModelProvider
} from 'uniai'

export interface ChatRequest {
    prompts: ChatMessage[]
    provider?: ChatModelProvider
    model?: ChatModel
    stream?: boolean
    top?: number
    temperature?: number
    maxLength?: number
}

export interface QueryResourceRequest {
    prompts: ChatMessage[]
    provider?: EmbedModelProvider
    model?: EmbedModel
    resourceId?: number
    maxPage?: number
}

export interface QueryResourcesRequest {
    input: string
    resourceId: number | number[]
    provider?: EmbedModelProvider
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
    provider?: EmbedModelProvider
    model?: EmbedModel
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
    provider?: ImagineModelProvider
    model?: ImagineModel
}

export interface TaskRequest {
    taskId?: string
    provider?: ImagineModelProvider
}

export interface ImgChangeRequest {
    taskId: string
    action: string
    provider?: ImagineModelProvider.MidJourney
    index?: number
}

export interface QueryResourceResponse {
    content: string
    similar: number
    page: number
    resourceId: number
}

export interface QueryResource {
    id: number
    page: number
    fileName: string
    fileSize: number
    filePath: string
    provider: EmbedModelProvider
    pages: {
        id: number
        page: number
        content: string
        tokens: number
        similar: number
        model: EmbedModel | string | null
    }[]
}

export interface EmbeddingResponse {
    id: number
    page: number
    tokens: number
    provider: EmbedModelProvider
    embedding: {
        id: number
        content: string
        tokens: number
        page: number
        model: EmbedModel | string | null
    }[]
}

export interface ResourcePage {
    id: number
    content: string
    similar: number
    page: number
    model: EmbedModel | string | null
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
    models: ChatModel[]
}
