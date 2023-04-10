/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Middleware } from '@eggjs/tegg'
// import auth from 'app/middleware/auth'

@HTTPController({ path: '/assistant' })
export default class Assistant {
    /*
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.POST })
    async userInfo(@Context() ctx: EggContext) {
        try {
            const res = await ctx.service.user.getUser(ctx.params.userId)
            ctx.service.res.success('User information', res)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/config', method: HTTPMethodEnum.POST })
    async config(@Context() ctx: EggContext) {
        try {
            const res = await ctx.service.user.getConfig()
            ctx.service.res.success('Config list', res)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: EggContext, @HTTPBody() params: ChatPost) {
        try {
            const userId = ctx.params.userId as number
            if (!userId) throw new Error('No user id')
            const input = params.input.trim()
            if (!input) throw new Error('Input nothing')
            const resourceId = params.dialogId

            const res = await ctx.service.chat.chat(input, userId, resourceId)
            ctx.service.res.success('Chat result', res)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/get-code', method: HTTPMethodEnum.POST })
    async getCode(@Context() ctx: EggContext, @HTTPBody() params: SignInPost) {
        try {
            const res = await ctx.service.phone.getCode(params.phone)
            ctx.service.res.success('success to get sms code', res)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/login', method: HTTPMethodEnum.POST })
    async signIn(@Context() ctx: EggContext, @HTTPBody() params: SignInPost) {
        try {
            const phone = params.phone
            const password = params.password
            const code = params.code
            if (!phone) throw new Error('Input phone')
            const res = await ctx.service.phone.signIn(phone, password, code)
            ctx.service.res.success('Success to sign in', res)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    */
}
