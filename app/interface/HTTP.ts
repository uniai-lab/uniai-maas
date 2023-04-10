/** @format */

interface StandardResponse<T> {
    status: number
    data: T
    msg: string
}

interface DialogResponseData {
    dialogId: number
    resourceId: number
    author: string
    page: number
    totalTokens: number
    fileSize: number
    fileName: string
    filePath: string
    updatedAt: Date
    typeId: number
    typeName: string
    typeDesc: string
}

interface ChatResponseData {
    userId: number
    content: string
    dialogId: number
    type: boolean
    avatar: string
    chatId?: number
}

interface ChatStreamResponseData extends ChatResponseData {
    end: boolean
}

interface UploadResponseData {
    id: number
    typeId: number
    page: number
    promptTokens: number
    totalTokens: number
    fileName: string
    fileSize: number
    filePath: string
    author: string
    userId: number
    createdAt: Date
    updatedAt: Date
}

interface UserWechatLoginResponseData {
    id: number
    wxOpenId: string
    wxUnionId: string
    token?: string
}

interface UserWechatRegisterResponseData extends UserinfoResponseData {
    fid?: number
}

interface UserinfoResponseData {
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
    chance?: {
        level: number
        uploadSize: number
        chatChance: number
        chatChanceUpdateAt: Date
        chatChanceFree: number
        chatChanceFreeUpdateAt: Date
        uploadChance: number
        uploadChanceUpdateAt: Date
        uploadFreeChance: number
        uploadChanceFreeUpdateAt: Date
        totalChatChance: number
        totalUploadChance: number
    }
    task?: UserTask[]
}

// app config table to object
interface ConfigResponseData {
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
    menu?: Array<ConfigMenu>
    task?: Array<ConfigTask>
}

/*==============================Post Request============================== */
interface EmbeddingPost {
    input: string
}

interface SimilarityPost {
    inputA: string
    inputB: string
}

interface ResourceUploadPost {
    resourceTypeId: number
    resourceTypeName: string
    fileName: string
}

interface ChatPost {
    input: string
    dialogId: number
}

interface ChatListPost {
    dialogId: number
}

interface DialogPost {
    resourceId: number
}

interface UserInfoPost {
    id: number
    token: string
    tokenTime: number
}

interface WXSignInPost {
    code: string
}

interface WXSignUpPost {
    code: string
    iv: string
    cloudID: string
    openid: string
    encryptedData: string
    fid: number
}

interface PhoneSignInPost {
    phone: string
    password: string
    code: string
}

interface SignInPost {
    username: string
    password: string
}

interface AdminUpdateResourcePost {
    resourceId: number
    fileName: string
    resourceTypeId: number
}

interface AdminAddFollowRewardPost {
    unionId: string
    openId: string
}

interface AdminUpdateUserPost {
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
