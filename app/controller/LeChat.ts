/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Middleware } from '@eggjs/tegg'
import { Readable } from 'stream'
import { UserContext } from '@interface/Context'
import auth from '@middleware/authC'
import { SignInRequest, UserInfoResponse, ChatRequest } from '@interface/controller/LeChat'
import { UserCache } from '@interface/Cache'

@HTTPController({ path: '/lechat' })
export default class LeChat {
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.POST })
    async userinfo(@Context() ctx: UserContext) {
        try {
            const user = ctx.user as UserCache

            const res = await ctx.service.leChat.getUser(user.id)
            if (!res) throw new Error('User not found')

            const data: UserInfoResponse = {
                id: res.id,
                username: res.username || '',
                name: res.name || '',
                phone: res.phone || '',
                countryCode: res.countryCode || 0,
                avatar: res.avatar || '',
                token: res.token || '',
                tokenTime: res.tokenTime || new Date()
            }
            ctx.service.res.success('User information', data)
        } catch (e) {
            ctx.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: UserContext, @HTTPBody() params: ChatRequest) {
        try {
            const { prompts, model, chunk, top, temperature, maxLength } = params
            if (!prompts.length) throw new Error('Empty prompts')

            const res = await ctx.service.uniAI.chat(prompts, true, model, undefined, top, temperature, maxLength)

            ctx.body = ctx.service.uniAI.parseSSE(res as Readable, model, chunk)
        } catch (e) {
            ctx.logger.error(e)
            ctx.service.res.error(e as Error, true)
        }
    }

    @HTTPMethod({ path: '/sign-in', method: HTTPMethodEnum.POST })
    async signIn(@Context() ctx: EggContext, @HTTPBody() params: SignInRequest) {
        try {
            const { username, password } = params
            if (!username.trim()) throw new Error('No username')
            if (!password.trim()) throw new Error('No password')

            const res = await ctx.service.leChat.signIn(username, password)

            const data: UserInfoResponse = {
                id: res.id,
                username: res.username || '',
                name: res.name || '',
                phone: res.phone || '',
                countryCode: res.countryCode || 0,
                avatar: res.avatar || '',
                token: res.token || '',
                tokenTime: res.tokenTime || new Date()
            }
            ctx.service.res.success('User information', data)
        } catch (e) {
            ctx.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
