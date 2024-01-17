/** @format */
// This is a middleware to check personal user login auth, add to controller -> action

// app/middleware/auth.ts
import { UserCache } from '@interface/Cache'
import { UserContext } from '@interface/Context'
import $ from '@util/util'

const EXPIRE_1 = 1 * 24 * 60 * 60 * 1000
const EXPIRE_7 = 7 * 24 * 60 * 60 * 1000

// check user auth
export default function auth() {
    return async (ctx: UserContext, next: () => Promise<any>) => {
        const id = parseInt(ctx.get('id'))
        const token = ctx.get('token')
        const appType = ctx.get('app-type')
        const expire = appType === 'web' ? EXPIRE_7 : EXPIRE_1

        const now = Date.now()
        const user = $.json<UserCache>(await ctx.app.redis.get(`user_${id}`))

        // find user in redis
        if (user && user.token === token && now - user.tokenTime < expire) ctx.user = user
        else return ctx.service.res.noAuth()

        await next()
    }
}
