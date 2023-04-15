/** @format */

import { EggContext } from '@eggjs/tegg'
import { ChatCompletionRequestMessage } from 'openai'
import $ from '@util/util'

export default {
    async log(ctx: EggContext, userId: number, log: GLMChatResaponse, message?: string) {
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
        let user = ''
        const history: string[] = []
        for (const item of messages) {
            if (item.role === 'assistant') {
                history.push(user)
                user = ''
                history.push(item.content)
            } else user += `${item.content}\n`
        }
        console.log(stream)
        let prompt = ''
        for (const item of messages) prompt += `[${item.role}] ${item.content}\n`
        console.log(prompt)
        return await $.post<GLMChatResaponse>(`${process.env.GLM_API as string}/chat`, { prompt })
    }
}
