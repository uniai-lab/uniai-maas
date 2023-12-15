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
