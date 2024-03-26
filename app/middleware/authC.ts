/**
 * @format by Prettier
 * This is a middleware to check user login auth, add to controller -> action
 * */

import { Context } from 'egg'

const EXPIRE_WX = 7 * 24 * 60 * 60 * 1000
const EXPIRE_WEB = 180 * 24 * 60 * 60 * 1000

// check user auth
export default function auth() {
    return async (ctx: Context, next: () => Promise<any>) => {
        const id = parseInt(ctx.get('id'))
        const token = ctx.get('token')
        const appType = ctx.get('app-type')
        const expire = appType === 'web' ? EXPIRE_WEB : EXPIRE_WX

        const now = Date.now()
        const user = await ctx.service.user.get(id)

        // check user token in redis
        if (user && user.token && user.token === token && now - user.tokenTime < expire) {
            ctx.user = user
            return await next()
        }
        return ctx.service.res.noAuth()
    }
}
