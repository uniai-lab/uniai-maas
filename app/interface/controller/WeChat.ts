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
    isEffect: boolean
}

export interface ChatListRequest {
    dialogId?: number
    lastId?: number
    pageSize?: number
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
export interface UploadAvatarResponse {
    avatar: string
}
export interface UpdateUserRequest {
    name?: string
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
    fileSize: number
    fileName: string
    filePath: string
    updatedAt: Date
    typeId: number
    type: string
    description: string | null
}

export type UserinfoResponse = {
    id: number
    tokenTime: number
    token: string | null
    name: string | null
    username: string | null
    avatar: string | null
    wxOpenId: string | null
    chance: {
        level: number
        uploadSize: number
        totalChatChance: number
        totalUploadChance: number
    }
    task: ConfigTask[]
    benefit: Benefit[]
}

export interface ConfigResponse {
    appName: string
    appVersion: string
    footer: string
    footerCopy: string
    officialAccount: string
    shareTitle: string
    shareDesc: string
    shareImg: string
    menu: ConfigMenu[]
    task: ConfigTask[]
    vip: ConfigVIP[]
    menuMember: ConfigMenuV2
    menuInfo: ConfigMenuV2
    menuShare: ConfigMenuV2
    menuFocus: ConfigMenuV2
    menuAdv: ConfigMenuV2
    showNewApp: string
    newAppId: string
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
export interface ConfigMenuV2 {
    icon: string
    title: string
    tip: string
    show: boolean
}
export interface Benefit {
    image: string
    title: string
    tip: string
    iconShadow: string
    tipColor: string
}

export interface ConfigVIP {
    bgImg: string
    bgLine: string
    bgStar: string
    titleImg: string
    backgroundColor: string
    boxShadow: string
    linearGradient: string
    color: string
    desc: string
    benefits: Benefit[]
}

export interface AnnounceResponse {
    id: number
    title: string
    content: string
    closeable: boolean
}

export interface TabResponse {
    id: number
    name: string
    desc: string
    pid: number
    child?: TabResponse[]
}

/* From WeChat APIs */
export interface WXAuthCodeRequest {
    grant_type: 'authorization_code'
    appid: string
    secret: string
    js_code: string
}

export interface WXAuthCodeResponse {
    openid?: string
    unionid?: string
    session_key?: string
    errcode?: number
    errmsg?: string
}

export interface WXAccessTokenRequest {
    grant_type: 'client_credential'
    appid: string
    secret: string
}

export interface WXAccessTokenResponse {
    access_token?: string
    expires_in?: number
    errcode?: number
    errmsg?: string
}

export interface WXSecCheckAPI {
    errcode?: number
    errmsg?: string
}

export interface WXUserPhoneNumberAPI {
    errcode?: number
    errmsg?: string
    phone_info?: {
        phoneNumber?: string
        purePhoneNumber?: string
        countryCode?: string
        watermark?: {
            timestamp?: number
            appid?: string
        }
    }
}

export interface WXDecodedData {
    phoneNumber: string
    purePhoneNumber: string
    countryCode: number
    watermark: {
        appid: string
        timestamp: number
    }
}

export interface WXMsgCheckRequest {
    content?: string
    media?: { contentType: string; value: Buffer }
    version?: number
    scene?: number
    openid?: string
    title?: string
    nickname?: string
    signature?: string
}

export interface WXMsgCheckResponse {
    errcode?: number
    errmsg?: string
    detail?: {
        strategy: string
        errcode: number
        suggest: string
        label: number
        keyword?: string
        prob?: number
        level?: number
    }[]
    trace_id?: string
    result?: {
        suggest: string
        label: number
    }
}
