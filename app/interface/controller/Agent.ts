/** @format */

import { ChatRoleEnum } from '@interface/Enum'

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
