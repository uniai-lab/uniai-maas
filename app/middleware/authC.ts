/** @format */
// This is a middleware to check personal user login auth, add to controller -> action

// app/middleware/auth.ts
import { UserContext } from '@interface/Context'

const EXPIRE_SHORT = 1 * 24 * 60 * 60 * 1000
const EXPIRE_LONG = 180 * 24 * 60 * 60 * 1000

// check user auth
export default function auth() {
    return async (ctx: UserContext, next: () => Promise<any>) => {
        try {
            const id = parseInt(ctx.get('id'))
            const token = ctx.get('token')
            const appType = ctx.get('app-type')
            const expire = appType === 'web' ? EXPIRE_LONG : EXPIRE_SHORT

            const now = Date.now()
            const user = await ctx.service.user.getUserCache(id)

            // check user access
            if (user && user.token === token && now - user.tokenTime < expire) ctx.user = user
            else throw new Error('Invalid user access')

            await next()
        } catch (e) {
            ctx.service.res.noAuth(e as Error)
        }
    }
}
