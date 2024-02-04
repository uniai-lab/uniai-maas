/** @format */

import { Context } from 'egg'

const EXPIRE = 10 * 60
const MAX = 10

// handle and format user http request and response
export default function shield(max: number = MAX) {
    return async (ctx: Context, next: () => Promise<any>) => {
        const { app } = ctx
        const ip = ctx.request.headers['x-forwarded-for'] || ctx.request.headers['x-real-ip'] || ctx.request.ip

        const key = `request_count_${ip}`
        const count = await app.redis.get(key)
        console.log(ip, count)

        if (count && parseInt(count) >= max) throw new Error('Too many requests')

        await app.redis.setex(key, EXPIRE, count ? parseInt(count) + 1 : 0)

        await next()
    }
}
