/** @format */
// This is a middleware to check business user login auth, add to controller -> action

import { Context } from 'egg'

// check company auth
export default function auth() {
    return async (ctx: Context, next: () => Promise<any>) => {
        // check admin token from header
        const token = ctx.get('token')
        const adminToken = await ctx.app.redis.get('ADMIN_TOKEN')
        if (token !== adminToken) return ctx.service.res.noAuth()

        await next()
    }
}
