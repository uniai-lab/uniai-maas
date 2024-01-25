/** @format */
// This is a middleware to check business user login auth, add to controller -> action

import { Context } from 'egg'

// check company auth
export default function auth() {
    return async (ctx: Context, next: () => Promise<any>) => {
        try {
            // check admin token from header
            if (ctx.get('token') !== (await ctx.app.redis.get('ADMIN_TOKEN'))) throw new Error('Invalid admin access')

            await next()
        } catch (e) {
            ctx.service.res.noAuth(e as Error)
        }
    }
}
