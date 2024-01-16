/** @format */

// model organizations
export enum ModelProvider {
    OpenAI = 'openai',
    IFlyTek = 'iflytek',
    Baidu = 'baidu',
    GLM = 'glm'
}

export enum EmbedModelEnum {
    OpenAI = 'openai',
    TextVec = 'text2vec'
}

// embed models
export enum OpenAIEmbedModel {
    ADA1 = 'text-embedding-ada-001',
    ADA2 = 'text-embedding-ada-002'
}
export enum TextVecEmbedModel {
    BASE_CHN = 'text2vec-base-chinese',
    LARGE_CHN = 'text2vec-large-chinese',
    BGE_LARGE_CHN = 'text2vec-bge-large-chinese',
    BASE_CHN_PARA = 'text2vec-base-chinese-paraphrase'
}

// chat models
export enum OpenAIChatModel {
    GPT3 = 'gpt-3.5-turbo',
    GPT3_16K = 'gpt-3.5-turbo-16k',
    GPT3_INSTRUCT = 'gpt-3.5-turbo-instruct',
    GPT4 = 'gpt-4',
    GPT4_32K = 'gpt-4-32k',
    GPT4_TURBO = 'gpt-4-1106-preview',
    GPT4_VISION = 'gpt-4-vision-preview'
}
export enum GLMChatModel {
    LOCAL = 'chatglm3-6b-32k',
    TURBO = 'chatglm-turbo'
}
// https://cloud.baidu.com/doc/WENXINWORKSHOP/s/clntwmv7t
export enum BaiduChatModel {
    ERNIE = 'completions', // ERNIE-Bot
    ERNIE4 = 'completions_pro', // ERNIE-Bot 4.0
    ERNIE_8K = 'ernie_bot_8k', // ERNIE-Bot-8K
    ERNIE_TURBO = 'eb-instant' // ERNIE-Bot-turbo
}
export enum FlyChatModel {
    V1 = 'v1.1',
    V2 = 'v2.1',
    V3 = 'v3.1'
}
export const FlyChatDomain = {
    [FlyChatModel.V1]: 'general',
    [FlyChatModel.V2]: 'generalv2',
    [FlyChatModel.V3]: 'generalv3'
}

// All chat models
export const ChatModelEnum = { ...OpenAIChatModel, ...BaiduChatModel, ...GLMChatModel, ...FlyChatModel }
export type ChatModelEnum = OpenAIChatModel | BaiduChatModel | GLMChatModel | FlyChatModel

export enum ImgModelEnum {
    SD = 'SD',
    DALLE = 'DALLE',
    MJ = 'MJ'
}

export enum FLYAuditType {
    TEXT = 'syncText',
    IMAGE = 'image',
    AUDIO = 'audio',
    VIDEO = 'video'
}

export enum AuditProvider {
    MINT = 'mint-filter', // a local json dict filter
    WX = 'wechat', // WeChat message check
    FLY = 'iflytek', // 科大讯飞NLP合规性接口
    AI = 'chatglm' // use LLM AI model
}

export enum MJTaskEnum {
    IMAGINE = 'IMAGINE',
    UPSCALE = 'UPSCALE',
    VARIATION = 'VARIATION',
    REROLL = 'REROLL',
    DESCRIBE = 'DESCRIBE',
    BLEND = 'BLEND'
}

// GPT model roles
export enum GPTChatRoleEnum {
    SYSTEM = 'system',
    USER = 'user',
    ASSISTANT = 'assistant',
    FUNCTION = 'function',
    TOOL = 'tool'
}

// Spark model roles
export enum SPKChatRoleEnum {
    USER = 'user',
    ASSISTANT = 'assistant'
}

// GLM model roles
export enum GLMChatRoleEnum {
    SYSTEM = 'system',
    USER = 'user',
    ASSISTANT = 'assistant',
    OBSERVATION = 'observation'
}

export enum OSSEnum {
    OSS = 'oss',
    COS = 'cos',
    MIN = 'minio'
}

// ALL model roles
export type ChatRoleEnum = GLMChatRoleEnum | GPTChatRoleEnum | SPKChatRoleEnum
export const ChatRoleEnum = { ...GLMChatRoleEnum, ...GPTChatRoleEnum, ...SPKChatRoleEnum }
