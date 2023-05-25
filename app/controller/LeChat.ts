/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Middleware } from '@eggjs/tegg'
import { UserContext } from '@interface/Context'
import auth from 'app/middleware/auth'
import { IncomingMessage } from 'http'
import { ChatCompletionRequestMessage } from 'openai'

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
            const model = params.model || 'GLM'

            const res = (await ctx.service.uniAI.chat(
                prompts,
                true,
                model,
                params.top,
                params.temperature,
                params.maxLength
            )) as IncomingMessage

            // parse stream data
            const { parser, stream } = ctx.service.uniAI.streamParser(model)
            if (!parser) throw new Error('Error to create parser')

            res.on('data', (buff: Buffer) => parser.feed(buff.toString()))
            res.on('error', e => stream.destroy(e))
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
