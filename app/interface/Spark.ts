/** @format */

import { ChatCompletionMessage } from 'openai/resources'

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
            text: ChatCompletionMessage[]
        }
    }
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
