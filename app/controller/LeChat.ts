/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Middleware } from '@eggjs/tegg'
import { UserContext } from '@interface/Context'
import auth from 'app/middleware/auth'
import { createParser, EventSourceParser } from 'eventsource-parser'
import { IncomingMessage } from 'http'
import { ChatCompletionRequestMessage } from 'openai'
import { PassThrough } from 'stream'
import isJSON from '@stdlib/assert-is-json'

@HTTPController({ path: '/lechat' })
export default class LeChat {
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.POST })
    async userinfo(@Context() ctx: UserContext) {
        try {
            const userId = ctx.userId as number
            const res = await ctx.service.user.getUser(userId)
            if (!res) throw new Error('User not found')
            const data: UserinfoResponseData = {
                id: res.id,
                username: res.username,
                name: res.name,
                phone: res.phone,
                countryCode: res.countryCode,
                avatar: res.avatar,
                token: res.token,
                tokenTime: res.tokenTime,
                wxOpenId: res.wxOpenId,
                wxUnionId: res.wxUnionId
            }
            ctx.service.res.success('User information', data)
        } catch (e) {
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: UserContext, @HTTPBody() params: UniAIChatPost) {
        try {
            const prompts = params.prompts as ChatCompletionRequestMessage[]
            if (!params.prompts.length) throw new Error('Empty prompts')
            params.model = params.model || 'GLM'

            const res = (await ctx.service.uniAI.chat(
                prompts,
                true,
                params.model,
                params.top,
                params.temperature,
                params.maxLength
            )) as IncomingMessage

            const stream = new PassThrough()
            const response: StandardResponse<UniAIChatResponseData> = {
                status: 1,
                data: {
                    content: '',
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    model: '',
                    object: ''
                },
                msg: ''
            }
            let parser: EventSourceParser
            // chat to GPT
            if (params.model === 'GPT')
                parser = createParser(e => {
                    if (e.type === 'event')
                        if (isJSON(e.data)) {
                            const data = JSON.parse(e.data) as CreateChatCompletionStreamResponse
                            response.data.content += data.choices[0].delta.content || ''
                            response.data.model = data.model
                            response.data.object = data.object
                            response.msg = 'success to get chat stream message from GPT'
                            if (response.data.content) stream.write(`data: ${JSON.stringify(response)}\n\n`)
                        }
                })

            // chat to GLM
            if (params.model === 'GLM')
                parser = createParser(e => {
                    if (e.type === 'event')
                        if (isJSON(e.data)) {
                            const data = JSON.parse(e.data) as GLMChatResponse
                            response.data.content = data.content
                            response.data.promptTokens = data.prompt_tokens
                            response.data.completionTokens = data.completion_tokens
                            response.data.totalTokens = data.total_tokens
                            response.data.model = data.model
                            response.data.object = data.object
                            response.msg = 'success to get chat stream message from GLM'
                            if (response.data.content) stream.write(`data: ${JSON.stringify(response)}\n\n`)
                        }
                })

            res.on('data', (buff: Buffer) => parser.feed(buff.toString('utf8')))
            res.on('error', () => stream.destroy(new Error(`chat stream error`)))
            res.on('end', () => stream.end())
            res.on('close', () => stream.destroy())

            ctx.set({
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                Connection: 'keep-alive'
            })
            ctx.body = stream
        } catch (e) {
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/sign-in', method: HTTPMethodEnum.POST })
    async signIn(@Context() ctx: EggContext, @HTTPBody() params: SignInPost) {
        try {
            if (!params.username.trim()) throw new Error('No username')
            if (!params.password.trim()) throw new Error('No password')

            const res = await ctx.service.user.signIn(params.username, params.password)
            const data: UserinfoResponseData = {
                id: res.id,
                username: res.username,
                name: res.name,
                phone: res.phone,
                countryCode: res.countryCode,
                avatar: res.avatar,
                token: res.token,
                tokenTime: res.tokenTime,
                wxOpenId: res.wxOpenId,
                wxUnionId: res.wxUnionId
            }
            ctx.service.res.success('User information', data)
        } catch (e) {
            ctx.service.res.error(e as Error)
        }
    }
}
