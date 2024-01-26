/** @format */

import { ChatModelEnum, ModelProvider } from '@interface/Enum'
import { Benefit, ConfigMenuV2, ConfigVIP } from './WeChat'

export interface SMSCodeRequest {
    phone: string
}
export interface SMSCodeResponse {
    id: number
    phone: string
}

export interface LoginRequest {
    phone: string
    code: string
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
    chance: {
        level: number
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
    value: string
    label: string
    disable: boolean
    children?: Option[]
}

export interface ChatRequest {
    input: string
    role?: string
    prompt?: string
    dialogId?: number
    provider?: ModelProvider
    model?: ChatModelEnum
}

export interface getQRCodeResponse {
    token: string
    code: string
    time: number
}
