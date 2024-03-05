/** @format */

import {
    ChatModel,
    ChatModelProvider,
    ChatRoleEnum,
    ImagineModel,
    ImagineModelProvider,
    ModelModel,
    ModelProvider
} from 'uniai'
import { Benefit, ConfigMenuV2, ConfigVIP } from '../Config'
import { OutputMode } from '@interface/Enum'

export interface SMSCodeRequest {
    phone: string
}
export interface SMSCodeResponse {
    id: number
    phone: string
}

export interface LoginRequest {
    phone: string
    code?: string
    password?: string
    fid?: number
}

export interface UserinfoResponse {
    id: number
    tokenTime: number
    token: string | null
    name: string | null
    username: string | null
    avatar: string | null
    phone: string | null
    score: number
    chance: {
        level: number
        levelExpiredAt: number
        uploadSize: number
        totalChatChance: number
        totalUploadChance: number
    }
    benefit: Benefit[]
    models: Option[]
}

export interface ConfigResponse {
    appName: string
    appVersion: string
    footer: string
    footerCopy: string
    officialAccount: string
    vip: ConfigVIP[]
    menuMember: ConfigMenuV2
    menuInfo: ConfigMenuV2
    menuShare: ConfigMenuV2
    menuFocus: ConfigMenuV2
    menuAdv: ConfigMenuV2
}

export interface Option {
    value: ModelProvider | ModelModel | null
    label: keyof typeof ModelProvider | ModelModel | string
    disabled: boolean
    children?: Option[]
}

export interface ChatRequest {
    input: string
    dialogId: number
    system?: string
    assistant?: string
    provider?: ChatModelProvider | ImagineModelProvider
    model?: ChatModel | ImagineModel
    mode?: OutputMode
}

export interface ChatResponse {
    chatId: number | null
    userId: number
    dialogId: number
    content: string
    resourceId: number | null
    role: ChatRoleEnum
    avatar: string | null
    model: ChatModelProvider | ImagineModelProvider | string | null
    subModel: ChatModel | ImagineModel | string | null
    file: {
        name: string
        size: number
        url: string
        ext: string
    } | null
    isEffect: boolean
}

export interface getQRCodeResponse {
    token: string
    code: string
    time: number
}

export interface UpdateUserRequest {
    name?: string
    password?: string
    avatar?: string
}

export interface UploadRequest {
    dialogId: number
}

export interface DialogListRequest {
    id?: number
    pageSize?: number
    lastId?: number
}

export interface DialogListResponse {
    id: number
    title: string
    updatedAt: Date
    createdAt: Date
}

export interface ChatListRequest {
    dialogId: number
    id?: number
    lastId?: number
    pageSize?: number
}
