/** @format */

export enum ChatModelEnum {
    GPT = 'GPT',
    GLM = 'GLM',
    SPARK = 'SPARK'
}
export enum ImgModelEnum {
    SD = 'SD',
    DALLE = 'DALLE',
    MJ = 'MJ'
}

export const AIModelEnum = { ...ChatModelEnum, ...ImgModelEnum }
export type AIModelEnum = ChatModelEnum | ImgModelEnum

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
