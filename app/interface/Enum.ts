/** @format */

export enum ChatModelEnum {
    GPT = 'GPT',
    GLM = 'GLM',
    SPARK = 'SPARK'
}
export enum EmbedModelEnum {
    GPT = 'GPT', // text-embedding-ada-002
    GLM = 'GLM' // text2vec-large-chinese
}
export enum ImgModelEnum {
    SD = 'SD',
    DALLE = 'DALLE',
    MJ = 'MJ'
}
export enum GPTSubModel {
    GPT3 = 'gpt-3.5-turbo',
    GPT4 = 'gpt-4'
}
export enum GLMSubModel {
    LOCAL = 'chatglm3-6b-32k',
    TURBO = 'chatglm-turbo'
}
export enum SPKSubModel {
    V1 = 'v1.1',
    V2 = 'v2.1',
    V3 = 'v3.1'
}
export const SPKSubModelDomain = {
    [SPKSubModel.V1]: 'general',
    [SPKSubModel.V2]: 'generalv2',
    [SPKSubModel.V3]: 'generalv3'
}
export enum FLYAuditType {
    TEXT = 'syncText',
    IMAGE = 'image',
    AUDIO = 'audio',
    VIDEO = 'video'
}

export enum ContentAuditEnum {
    MINT = 'mint-filter', // a local json dict filter
    WX = 'WeChat', // WeChat message check
    FLY = 'iFlyTek', // 科大讯飞NLP合规性接口
    AI = 'AI' // use LLM AI model
}

export const AIModelEnum = { ...ChatModelEnum, ...ImgModelEnum, ...EmbedModelEnum }
export type AIModelEnum = ChatModelEnum | ImgModelEnum | EmbedModelEnum

export const ChatSubModelEnum = { ...GPTSubModel, ...GLMSubModel, ...SPKSubModel }
export type ChatSubModelEnum = GPTSubModel | GLMSubModel | SPKSubModel

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
