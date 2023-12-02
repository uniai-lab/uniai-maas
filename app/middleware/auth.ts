/** @format */
// This is a middleware to check user login auth, add to controller -> action

// app/middleware/auth.ts
import { UserTokenCache } from '@interface/Cache'
import { UserContext } from '@interface/Context'
import $ from '@util/util'

const EXPIRE = 1000 * 60 * 60 * 24

// check user auth
export default function auth() {
    return async (ctx: UserContext, next: () => Promise<any>) => {
        const id = ctx.get('id')
        const token = ctx.get('token')

        const user = $.json<UserTokenCache>(await ctx.app.redis.get(`token_${id}`))
        const now = Date.now()

        // check user auth in redis
        if (user && user.token === token && now - user.time < EXPIRE) ctx.userId = user.id
        else {
            // check user auth in SQL
            const user = await ctx.model.User.findOne({
                where: { id, token, isDel: false, isEffect: true },
                attributes: ['id', 'tokenTime']
            })
            if (!user) return ctx.service.res.noAuth()
            const time = user.tokenTime?.getTime() || 0
            if (now - time > EXPIRE) return ctx.service.res.noAuth()

            const cache: UserTokenCache = {
                id: user.id,
                token,
                time
            }
            await ctx.app.redis.set(`token_${id}`, JSON.stringify(cache))
            ctx.userId = user.id
        }
        await next()
    }
}
// check admin auth
export function authAdmin() {
    return async (ctx: UserContext, next: () => Promise<any>) => {
        // check admin token from header
        const token: string = ctx.get('token')
        if (token === process.env.ADMIN_TOKEN) await next()
        else ctx.service.res.noAuth()
    }
}
