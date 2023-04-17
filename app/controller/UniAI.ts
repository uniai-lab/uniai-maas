/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Inject } from '@eggjs/tegg'
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai'

@HTTPController({ path: '/ai' })
export default class UniAI {
    @Inject()
    logger: EggContext

    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: EggContext, @HTTPBody() params: UniAIChatPost) {
        try {
            const prompts = params.prompts as ChatCompletionRequestMessage[]
            const model = params.model || 'GLM'
            if (!params.prompts.length) throw new Error('Empty prompts')
            // chat to GPT
            if (params.model === 'GPT') {
                const res = (await ctx.service.uniAI.chat(prompts, model)) as CreateChatCompletionResponse
                if (res.choices[0].message?.content)
                    ctx.service.res.success('Success to chat to GPT', {
                        message: res.choices[0].message.content,
                        promptTokens: res.usage?.prompt_tokens,
                        completionTokens: res.usage?.completion_tokens,
                        totalTokens: res.usage?.total_tokens,
                        model: res.model,
                        object: res.object,
                        prompts: params.prompts
                    } as UniAIChatResponseData)
                else throw new Error('Error to chat to GPT')
            }
            // chat to GLM
            if (params.model === 'GLM') {
                const res = (await ctx.service.uniAI.chat(prompts, model)) as GLMChatResponse
                if (res.content)
                    ctx.service.res.success('Success to chat to GLM', {
                        message: res.content,
                        promptTokens: res.prompt_tokens,
                        completionTokens: res.completion_tokens,
                        totalTokens: res.total_tokens,
                        model: res.model,
                        object: res.object,
                        prompts: params.prompts
                    } as UniAIChatResponseData)
                else throw new Error('Error to chat to GLM')
            }
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.GET })
    async chatStream(@Context() ctx: EggContext) {
        await ctx.render('index/chat.html')
    }
}
