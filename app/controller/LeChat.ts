/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Middleware } from '@eggjs/tegg'
import auth from 'app/middleware/auth'

@HTTPController({ path: '/lechat' })
export default class LeChat {
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.POST })
    async userinfo(@Context() ctx: EggContext) {
        try {
            const res = await ctx.service.user.getUser(parseInt(ctx.params.userId))
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
