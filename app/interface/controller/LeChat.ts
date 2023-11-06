/** @format */

import { ChatModelEnum } from '@interface/Enum'
import { ChatMessage } from '@interface/controller/UniAI'

export interface SignInRequest {
    username: string
    password: string
}

export interface UserInfoResponse {
    id: number
    name: string
    username: string
    phone: string
    countryCode: number
    avatar: string
    token: string
    tokenTime: Date
}

export interface ChatRequest {
    prompts: ChatMessage[]
    maxLength?: number
    top?: number
    temperature?: number
    model?: ChatModelEnum
    subModel?: string
    chunk?: boolean
}

export interface ChatResponse {
    content: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    model: string
    object: string
}
