/** @format */

import { ChatModelEnum, ChatSubModelEnum } from '@interface/Enum'

export interface ChatStreamCache {
    chatId: number
    dialogId: number
    content: string
    time: number
    resourceId: number | null
    model: ChatModelEnum | null
    subModel: string | null
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
    updatedAt?: Date
    createdAt?: Date
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
        updatedAt?: Date
        createdAt?: Date
    }
}
