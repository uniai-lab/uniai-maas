/** @format */

import { EggContext } from '@eggjs/tegg'
import { ChatCompletionRequestMessage } from 'openai'
import $ from '@util/util'

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

        return stream
            ? await $.post<GLMChatRequest, T>(`${url}/chat-stream`, params, { responseType: 'stream' })
            : await $.post<GLMChatRequest, T>(`${url}/chat`, params, { responseType: 'json' })
    }
}
