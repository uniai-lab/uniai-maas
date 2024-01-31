/** @format */

import { ChatRoleEnum } from 'uniai'

export interface AddPromptRequest {
    id?: number
    typeId?: number
    role: ChatRoleEnum
    content: string
}
export interface AddPromptResponse {
    id: number
    typeId: number
    role: ChatRoleEnum
    content: string
    userId: number
    tokens: number
}
