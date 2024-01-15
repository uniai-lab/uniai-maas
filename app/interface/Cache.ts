/** @format */

import { ChatModelEnum, ModelEnum } from '@interface/Enum'

export interface ChatStreamCache {
    chatId: number
    dialogId: number
    content: string
    time: number
    resourceId: number | null
    model: ModelEnum | null
    subModel: ChatModelEnum | string | null
    isEffect: boolean
}

export interface UserCache {
    id: number
    username: string | null
    phone: string | null
    email: string | null
    password: string | null
    token: string | null
    name: string | null
    countryCode: number | null
    avatar: string | null
    wxOpenId: string | null
    wxPublicOpenId: string | null
    wxUnionId: string | null
    wxSessionKey: string | null
    tokenTime: number
    isEffect: boolean
    isDel: boolean
    updatedAt?: string | Date
    createdAt?: string | Date
    chance: {
        id: number
        userId: number
        level: number
        uploadSize: number
        chatChance: number
        chatChanceUpdateAt: number
        chatChanceFree: number
        chatChanceFreeUpdateAt: number
        uploadChance: number
        uploadChanceUpdateAt: number
        uploadChanceFree: number
        uploadChanceFreeUpdateAt: number
        updatedAt?: string | Date
        createdAt?: string | Date
    }
}

export interface WXAccessTokenCache {
    token: string
    expire: number
}
