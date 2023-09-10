/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Middleware } from '@eggjs/tegg'
import { UserContext } from '@interface/Context'
import { ChatCompletionRequestMessage } from 'openai'
import { PassThrough, Stream } from 'stream'
import auth from 'app/middleware/auth'

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
                avatar: res.avatar || process.env.DEFAULT_AVATAR_USER,
                token: res.token,
                tokenTime: res.tokenTime
            }
            ctx.service.res.success('User information', data)
        } catch (e) {
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/query-online', method: HTTPMethodEnum.POST })
    async queryOnline(@Context() ctx: UserContext, @HTTPBody() params: UniAIQueryOnlinePost) {
        const prompts = params.prompts as ChatCompletionRequestMessage[]
        if (!prompts.length) throw new Error('Empty prompts')
        const query = prompts.pop() as ChatCompletionRequestMessage
        const stream = new PassThrough()
        ctx.service.leChat.searchStream(query.content, stream)
        ctx.body = stream
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: UserContext, @HTTPBody() params: UniAIChatPost) {
        try {
            const prompts = params.prompts as ChatCompletionRequestMessage[]
            if (!params.prompts.length) throw new Error('Empty prompts')
            const model = params.model || 'GLM'
            const chunk = params.chunk || false

            const res = await ctx.service.uniAI.chat(
                prompts,
                true,
                model,
                params.top,
                params.temperature,
                params.maxLength
            )

            ctx.body = ctx.service.uniAI.parseSSE(res as Stream, model, chunk)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/sign-in', method: HTTPMethodEnum.POST })
    async signIn(@Context() ctx: EggContext, @HTTPBody() params: SignInPost) {
        try {
            const { username, password } = params
            if (!username.trim()) throw new Error('No username')
            if (!password.trim()) throw new Error('No password')

            const res = await ctx.service.user.signIn(username, password)
            const data: UserinfoResponseData = {
                id: res.id,
                username: res.username,
                name: res.name,
                phone: res.phone,
                countryCode: res.countryCode,
                avatar: res.avatar || process.env.DEFAULT_AVATAR_USER,
                token: res.token,
                tokenTime: res.tokenTime
            }
            ctx.service.res.success('User information', data)
        } catch (e) {
            ctx.service.res.error(e as Error)
        }
    }
}
