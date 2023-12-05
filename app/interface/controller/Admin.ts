/** @format */

import { EmbedModelEnum } from '@interface/Enum'

export interface UploadRequest {
    userId?: number
    typeId?: number
    filename?: string
    init?: boolean
    model?: EmbedModelEnum
    resourceId?: number
}

export interface AddFollowRewardRequest {
    unionId: string
    openId: string
}

export interface UpdateUserRequest {
    username: string
    password: string
    phone?: string
    avatar?: string
    email?: string
    chatChance?: number
    uploadChance?: number
    level?: number
    countryCode?: number
}

export interface UploadResponse {
    id: number
    typeId: number
    page: number
    tokens: number
    fileName: string
    fileSize: number
    filePath: string
    userId: number
    createdAt: Date
    updatedAt: Date
}
