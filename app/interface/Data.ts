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
    readonly SPARK: 'SPARK'
    readonly SD: 'SD'
    readonly DALLE: 'DALLE'
    readonly MJ: 'MJ'
}
declare type AIModelEnum = (typeof AIModelEnum)[keyof typeof AIModelEnum]

declare const MJTaskEnum: {
    readonly IMAGINE: 'IMAGINE'
    readonly UPSCALE: 'UPSCALE'
    readonly VARIATION: 'VARIATION'
    readonly REROLL: 'REROLL'
    readonly DESCRIBE: 'DESCRIBE'
    readonly BLEND: 'BLEND'
}
declare type MJTaskEnum = (typeof MJTaskEnum)[keyof typeof MJTaskEnum]
