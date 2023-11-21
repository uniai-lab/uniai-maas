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
export interface GLMTurboChatRequest {
    prompt: GLMChatMessage[]
    temperature?: number
    top_p?: number
    request_id?: string
    incremental?: string
    return_type?: string
    ref?: {
        enable?: boolean
        search_query?: string
    }
}
export interface GLMTurboChatResponse {
    code: number // 错误码
    msg: string // 错误信息
    success: boolean // 请求成功或失败的标识
    data?: GLMTurboResponseData // 响应数据
}
export interface GLMTurboResponseData {
    choices: Choice[] // 对话模型的输出内容
    request_id: string // 请求时的任务编号
    task_id: string // 任务订单号
    task_status: 'PROCESSING' | 'SUCCESS' | 'FAIL' // 处理状态
    usage: Usage // 模型调用的 tokens 数量统计
}

export interface GLMChatMessage {
    role: GLMChatRoleEnum
    content: string | null
    metadata?: string | null
    tools?: {}[] | null
}

interface Choice {
    role: 'assistant'
    content: string
}

interface Usage {
    prompt_tokens: number // 用户输入的 tokens 数量
    completion_tokens: number // 模型输出的 tokens 数量
    total_tokens: number // 总 tokens 数量
}
