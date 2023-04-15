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
    async chat(messages: ChatCompletionRequestMessage[], stream: boolean = false) {
        console.log(stream)
        let prompt = ''
        const history: string[] = []
        for (const item of messages) {
            if (item.role === 'assistant') {
                history.push(prompt)
                history.push(item.content)
                prompt = ''
            } else prompt += `${item.content}\n`
        }
        console.log(history)
        console.log(prompt)
        return await $.post<GLMChatRequest, GLMChatResponse>(`${process.env.GLM_API as string}/chat`, {
            prompt,
            history: history.length ? [history] : []
        })
    }
}
