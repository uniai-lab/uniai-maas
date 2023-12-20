/** @format */

import { Context } from 'egg'

// handle error user response
export default function errorHandler() {
    return async (ctx: Context, next: () => Promise<any>) => {
        try {
            await next()
        } catch (e) {
            ctx.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
