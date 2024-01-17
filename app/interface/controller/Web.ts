/** @format */

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
