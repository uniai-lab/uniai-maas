/** @format */

import { AIModelEnum, ChatRoleEnum } from '@interface/Enum'

export interface ChatRequest {
    input: string
    dialogId?: number
}

export interface ChatResponse {
    userId: number
    content: string
    dialogId: number
    resourceId: number | null
    chatId: number | null
    model: AIModelEnum | null
    type: boolean
    role: ChatRoleEnum
    avatar: string
}

export interface ChatListRequest {
    dialogId?: number
}

export interface SignInRequest {
    code: string
    fid?: number
}

export interface SignUpRequest {
    code: string
    iv: string
    cloudID: string
    openid: string
    encryptedData: string
    fid: number
}

export interface UploadRequest {
    fileName?: string
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
    dialogId: number
}
export interface ResourceRequest {
    resourceId: number
}
export interface ResourceResponse {
    id: number
    name: string
    size: number
    ext: string
    path: string
    pages: string[]
}

export interface DialogResponse {
    dialogId: number
    resourceId: number | null
    page: number
    totalTokens: number
    fileSize: number
    fileName: string
    filePath: string
    fileExt: string
    updatedAt: Date
    typeId: number
    type: string
    description: string
}

export type UserinfoResponse = {
    id: number
    name: string
    username: string
    phone: string
    countryCode: number
    avatar: string
    token: string
    tokenTime: Date
    wxOpenId: string
    wxUnionId: string
    chance: {
        level: number
        uploadSize: number
        chatChance: number
        chatChanceUpdateAt: Date
        chatChanceFree: number
        chatChanceFreeUpdateAt: Date
        uploadChance: number
        uploadChanceUpdateAt: Date
        uploadChanceFree: number
        uploadChanceFreeUpdateAt: Date
        totalChatChance: number
        totalUploadChance: number
    }
    task?: UserTask[]
    fid?: number
}

export interface ConfigResponse {
    appName?: string
    appVersion?: string
    weekChatChance?: string
    weekResourceAmount?: string
    resourceSize?: string
    shareReward?: string
    footer?: string
    footerCopy?: string
    officialAccount?: string
    shareTitle?: string
    shareDesc?: string
    shareImg?: string
    DEFAULT_AVATAR_AI?: string
    DEFAULT_AVATAR_USER?: string
    DEFAULT_USERNAME?: string
    DEFAULT_FREE_CHAT_CHANCE?: string
    DEFAULT_FREE_UPLOAD_CHANCE?: string
    SHARE_REWARD_CHAT_CHANCE?: string
    SHARE_REWARD_UPLOAD_CHANCE?: string
    FOLLOW_REWARD_CHAT_CHANCE?: string
    INIT_RESOURCE_ID?: string
    menu?: ConfigMenu[]
    task?: ConfigTask[]
}

export interface ConfigMenu {
    image?: string
    title?: string
    tip?: string
}

export interface ConfigTask {
    title?: string
    tip?: string
    button?: string
    type?: number
}

export interface UserTask extends ConfigTask {
    flag?: boolean
}

export interface AnnounceResponse {
    title: string
    content: string
    closeable: boolean
}
