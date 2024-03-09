/** @format */

import { Context } from 'egg'

// handle and format user http request and response
export default function transaction() {
    return async (ctx: Context, next: () => Promise<any>) => {
        try {
            ctx.transaction = await ctx.model.transaction()
            await next()
            await ctx.transaction?.commit()
        } catch (e) {
            await ctx.transaction?.rollback()
            throw e
        }
    }
}
