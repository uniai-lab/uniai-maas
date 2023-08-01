/** @format */

interface StandardResponse<T> {
    status: number
    data: T
    msg: string
}

interface DialogResponseData {
    dialogId: number
    resourceId: number
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
    userId: number
    createdAt: Date
    updatedAt: Date
}

interface UserinfoResponseData {
    id: number
    name: string
    username: string
    phone?: string
    countryCode?: number
    avatar: string
    token: string
    tokenTime: Date
    wxOpenId?: string
    wxUnionId?: string
    chance?: {
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
    INIT_RESOURCE_ID?: string
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
    dialogId?: number
    model?: AIModelEnum
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

/*===========================Admin POST======================*/

interface AdminUpdateResourcePost {
    resourceId: number
    fileName: string
    resourceTypeId: number
    init: boolean
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

/*================================UniAI API=================================*/
interface UniAIChatPrompt {
    role: string
    content: string
    name?: string
}
interface UniAIChatPost {
    prompts: UniAIChatPrompt[]
    maxLength?: number
    top?: number
    temperature?: number
    model?: AIModelEnum
    chunk?: boolean
}
interface UniAIQueryOnlinePost {
    prompts: UniAIChatPrompt[]
}
interface UniAIQueryResourcePost {
    prompts: UniAIChatPrompt[]
    model?: AIModelEnum
    resourceId?: number
    maxPage?: number
    maxToken?: number
}
interface UniAIEmbeddingPost {
    content: string
    fileName: string
    filePath: string
    fileSize: number
    model?: AIModelEnum
}
interface UniAITxt2ImgPost {
    prompt: string
    negativePrompt: string
    width: number
    height: number
    steps: number
    batchSize: number
    restoreFace: boolean
    seed: number
    denoising: number
}
interface UniAIChatResponseData {
    content: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    model: string
    object: string
}
interface UniAIEmbeddingResponseData {
    id: number
    page: number
    promptTokens: number
    totalTokens: number
}
interface UniAITxt2ImgResponseData {
    images: string[]
    info: string
}
interface UniAIImgProgressResponseData {
    progress: number
    etaRelative: number
    image: string | null
    txt: string | null
}
