/** @format */

export interface UpdateResourceRequest {
    resourceId: number
    fileName: string
    resourceTypeId: number
    init: boolean
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
