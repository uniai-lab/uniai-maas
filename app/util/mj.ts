/**
 * @format
 * util for Mid Journey proxy API connect
 * https://github.com/novicezk/midjourney-proxy/
 * 2023-9-12
 * devilyouwei
 */

import { MJChangeRequest, MJImagineRequest, MJImagineResponse, MJTaskResponse } from '@interface/MJ'
import $ from './util'
import { MJTaskEnum } from '@interface/Enum'

const API = process.env.MID_JOURNEY_API
const TOKEN = process.env.MID_JOURNEY_TOKEN
const headers = { 'mj-api-secret': TOKEN }

export default {
    async imagine(prompt: string, nPrompt: string = '', width: number = 1, height: number = 1) {
        const aspect = $.getAspect(width, height)
        const res = await $.post<MJImagineRequest, MJImagineResponse>(
            `${API}/mj/submit/imagine`,
            { prompt: `${prompt} --ar ${aspect} ${nPrompt ? '--no ' + nPrompt : ''}` },
            { headers }
        )
        if (res.code !== 1) throw new Error(res.description)
        return res
    },
    async task(id: string) {
        if (id) return [await $.get<null, MJTaskResponse>(`${API}/mj/task/${id}/fetch`, null, { headers })]
        else return await $.get<null, MJTaskResponse[]>(`${API}/mj/task/list`, null, { headers })
    },
    change(taskId: string, action: MJTaskEnum, index?: number) {
        return $.post<MJChangeRequest, MJImagineResponse>(
            `${API}/mj/submit/change`,
            { taskId, action, index },
            { headers }
        )
    },
    queue() {
        return $.get<null, MJTaskResponse[]>(`${API}/mj/task/queue`, null, { headers: { 'mj-api-secret': TOKEN } })
    }
}
