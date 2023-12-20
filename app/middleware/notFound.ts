/** @format */

import { Context } from 'egg'

export default function notFound() {
    return async (ctx: Context, next: () => Promise<any>) => {
        if (ctx.status === 404)
            ctx.service.res.error(new Error(`${ctx.method} ${ctx.URL} ${ctx.status} ${ctx.message}`))

        await next()
    }
}
