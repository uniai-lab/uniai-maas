/**
 * @format
 * util for Mid Journey proxy API connect
 * https://github.com/novicezk/midjourney-proxy/
 * 2023-9-12
 * devilyouwei
 */
import $ from './util'
const API = process.env.MID_JOURNEY_API
const TOKEN = process.env.MID_JOURNEY_TOKEN

export default {
    imagine(prompt: string) {
        return $.post<MJImagineRequest, MJImagineResponse>(
            `${API}/mj/submit/imagine`,
            { prompt },
            { headers: { 'mj-api-secret': TOKEN } }
        )
    },
    task(id: string) {
        console.log(id)
        return $.get<null, MJTaskResponse>(`${API}/mj/task/${id}/fetch`, null, { headers: { 'mj-api-secret': TOKEN } })
    }
}

interface MJImagineRequest {
    prompt: string
    base64Array?: string[]
    notifyHook?: string
    state?: string
}

export interface MJImagineResponse {
    code: number
    description: string
    result: string
    properties: {
        discordInstanceId: string
    }
}

export interface MJTaskResponse {
    id: string
    properties: {
        notifyHook: string | null
        discordInstanceId: string
        flags: number
        messageId: string
        messageHash: string
        nonce: string
        finalPrompt: string
        progressMessageId: string
    }
    action: MJTaskEnum
    status: string
    prompt: string
    promptEn: string
    description: string
    state: string
    submitTime: number
    startTime: number
    finishTime: number
    imageUrl: string
    progress: string
    failReason: string | null
}
