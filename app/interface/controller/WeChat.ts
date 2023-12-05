/** @format */

import { ChatModelEnum, ChatRoleEnum } from '@interface/Enum'

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
    model: ChatModelEnum | null
    type: boolean
    role: ChatRoleEnum
    avatar: string | null
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
    id: number
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
    description: string | null
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
    task: ConfigTask[]
    fid?: number
}

export interface ConfigResponse {
    appName: string | null
    appVersion: string | null
    footer: string | null
    footerCopy: string | null
    officialAccount: string | null
    shareTitle: string | null
    shareDesc: string | null
    shareImg: string | null
    menu: ConfigMenu[]
    task: ConfigTask[]
}

export interface ConfigTask {
    title: string
    tip: string
    button: string
    type: number
}

export interface ConfigMenu {
    image: string
    title: string
    tip: string
}

export interface AnnounceResponse {
    title: string
    content: string
    closeable: boolean
}
