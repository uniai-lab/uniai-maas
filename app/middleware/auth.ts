/** @format */
// This is a middleware to check user login auth, add to controller -> action

// app/middleware/auth.ts
import { UserContext } from '@interface/Context'
const EXPIRE = 1000 * 60 * 60 * 24 * 7

// check user auth
export default function auth() {
    return async (ctx: UserContext, next: () => Promise<any>) => {
        // find user by token
        const user = await ctx.model.User.findOne({
            where: { token: ctx.get('token'), isDel: false, isEffect: true },
            attributes: ['id', 'tokenTime']
        })

        // check user existed and login if expired
        if (user && new Date().getTime() - user.tokenTime.getTime() < EXPIRE) ctx.userId = user.id
        else return ctx.service.res.noAuth()
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
