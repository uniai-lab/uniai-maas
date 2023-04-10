/** @format */

// app/middleware/not_found.ts
import { Context } from 'egg'

export default function notFound() {
    return async (ctx: Context, next: () => Promise<any>) => {
        await next()
        if (ctx.status === 404 && !ctx.body) await ctx.render('404.html')
    }
}
