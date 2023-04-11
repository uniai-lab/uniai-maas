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
    buttonTitle?: string
    type?: number
}

interface ChatStreamCache {
    dialogId: number
    content: string
    end: boolean
    time: number
    chatId?: number
    error?: Error
}

interface UserTask extends ConfigTask {
    flag?: boolean
}
