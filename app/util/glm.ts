/** @format */

import { EggContext } from '@eggjs/tegg'
import { ChatCompletionRequestMessage } from 'openai'
import $ from '@util/util'
import { IncomingMessage } from 'http'

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
    async chat<T = GLMChatRequest | IncomingMessage>(
        messages: ChatCompletionRequestMessage[],
        stream: boolean = false,
        maxLength?: number,
        top?: number,
        temperature?: number
    ) {
        let prompt = ''
        const history: string[] = []
        for (const item of messages) {
            if (item.role.toLowerCase() === 'assistant') {
                history.push(prompt.trim()) // user message
                history.push(item.content.trim()) // ai message
                prompt = ''
            } else prompt += `${item.content}\n`
        }

        const url = process.env.GLM_API as string
        const params: GLMChatRequest = { prompt: prompt.trim(), temperature, top_p: top, max_length: maxLength }
        if (history.length) params.history = [history]

        return stream
            ? await $.post<GLMChatRequest, T>(`${url}/chat-stream`, params, { responseType: 'stream' })
            : await $.post<GLMChatRequest, T>(`${url}/chat`, params, { responseType: 'json' })
    }
}
