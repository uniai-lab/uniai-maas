/** @format */
// This is a middleware to check user login auth, add to controller -> action

// app/middleware/auth.ts
import { UserTokenCache } from '@interface/Cache'
import { UserContext } from '@interface/Context'
import $ from '@util/util'
const EXPIRE = 1000 * 60 * 60 * 24 * 7

// check user auth
export default function auth() {
    return async (ctx: UserContext, next: () => Promise<any>) => {
        // find user by token
        const id = parseInt(ctx.get('id')) || 0
        const token = ctx.get('token')
        const user = await $.getCache<UserTokenCache>(`token_${id}`)
        const now = new Date().getTime()

        // check user auth in redis
        if (user && user.id === id && user.token === token && now - user.time < EXPIRE) ctx.userId = user.id
        else {
            // check user auth in SQL
            const user = await ctx.model.User.findOne({
                where: { id, token, isDel: false, isEffect: true },
                attributes: ['id', 'tokenTime']
            })
            const time = user?.tokenTime?.getTime() || 0
            if (user && now - time < EXPIRE) {
                await $.setCache<UserTokenCache>(`token_${id}`, { id, token, time })
                ctx.userId = user.id
            } else return ctx.service.res.noAuth()
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
