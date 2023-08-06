/** @format */

interface ResourceFile {
    text: string
    name: string // origin name
    path: string // temp cache path
    ext: string // extension of file
    size: number // file size
}

interface ConfigMenu {
    image?: string
    title?: string
    tip?: string
}

interface ConfigTask {
    title?: string
    tip?: string
    button?: string
    type?: number
}

interface ChatStreamCache {
    chatId: number
    dialogId: number
    content: string
    end: boolean
    time: number
}
interface UserTokenCache {
    id: number
    token: string
    time: number
}

interface UserTask extends ConfigTask {
    flag?: boolean
}

declare const AIModelEnum: {
    readonly GPT: 'GPT'
    readonly GLM: 'GLM'
}
declare type AIModelEnum = (typeof AIModelEnum)[keyof typeof AIModelEnum]
