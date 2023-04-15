/** @format */

import { EggContext } from '@eggjs/tegg'
import { ChatCompletionRequestMessage } from 'openai'
import $ from '@util/util'
import EventSource from 'eventsource'
import qs from 'qs'
import { Stream } from 'stream'

export default {
    async log(ctx: EggContext, userId: number, log: GLMChatResponse, message?: string) {
        return await ctx.model.OpenAILog.create({
            model: log.model,
            userId,
            object: log.object,
            promptTokens: log.prompt_tokens,
            totalTokens: log.total_tokens,
            message
        })
    },
    async chat<T>(messages: ChatCompletionRequestMessage[], stream: boolean = false) {
        let prompt = ''
        const history: string[] = []
        for (const item of messages) {
            if (item.role === 'assistant') {
                history.push(prompt)
                history.push(item.content)
                prompt = ''
            } else prompt += `${item.content}\n`
        }
        const url = process.env.GLM_API as string
        const params: GLMChatRequest = { prompt }
        if (history.length) params.history = [history]
        const json = qs.stringify({ jsonData: JSON.stringify(params) })

        if (stream) return new EventSource(`${url}/chat-stream?${json}`) as T
        else return await $.post<GLMChatRequest, T>(`${url}/chat`, params)
    }
}
