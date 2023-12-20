/** @format */

import { SPKChatRoleEnum } from '@interface/Enum'

// spark chat model request interface
export interface SPKChatRequest {
    header: {
        app_id: string
        uid?: string
    }
    parameter: {
        chat: {
            domain: string
            temperature?: number
            max_tokens?: number
            top_k?: number
            chat_id?: number
        }
    }
    payload: {
        message: {
            text: SPKChatMessage[]
        }
    }
}

export interface SPKChatMessage {
    role: SPKChatRoleEnum
    content: string
}

// spark chat model response interface
export interface SPKChatResponse {
    header: {
        code: number
        message: string
        sid: string
        status: number
    }
    payload: {
        choices: {
            status: number
            seq: number
            text: [
                {
                    content: string
                    role: string
                    index: number
                }
            ]
        }
        usage?: {
            text: {
                question_tokens: number
                prompt_tokens: number
                completion_tokens: number
                total_tokens: number
            }
        }
        model: string
        object: string
    }
}

export interface FlyAuditParams {
    accessKeyId: string
    accessKeySecret: string
    appId: string
    utc: string
    uuid: string
    modeType?: 'base64' | 'link'
}

export interface FlyAuditRequest {
    content: string
    is_match_all?: number
    categories?: string[]
    lib_ids?: string[]
    biz_type?: string
}

export interface FlyAuditResponse {
    code: string
    desc: string
    data: {
        result: {
            suggest: 'pass' | 'block'
            detail: object
        }
        request_id: string
    }
    sid: string
}
