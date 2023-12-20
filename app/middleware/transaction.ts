/** @format */

import { Context } from 'egg'

// handle and format user http request and response
export default function transaction() {
    return async (ctx: Context, next: () => Promise<any>) => {
        const transaction = await ctx.model.transaction()
        try {
            await next()
            await transaction.commit()
        } catch (e) {
            await transaction.rollback()
            throw e
        }
    }
}
