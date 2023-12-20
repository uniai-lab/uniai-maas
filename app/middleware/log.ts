/** @format */

import { UserContext } from '@interface/Context'

// handle and format user http request and response
export default function log() {
    return async (ctx: UserContext, next: () => Promise<any>) => {
        const { ip, method, header, body, query, files, url } = ctx.request
        const [controller, action] = url.split(/[\/?]/).filter(item => item.trim() !== '')
        const userId = ctx.user?.id
        try {
            await next()
            const { status, msg, data } = ctx.response.body as StandardResponse<object>
            const log = { userId, ip, method, header, body, query, files, status, data, msg, controller, action }
            await ctx.model.HTTPLog.create(log)
        } catch (e) {
            const status = 0
            const msg = (e as Error).message
            const log = { userId, ip, method, header, body, query, files, status, msg, controller, action }
            await ctx.model.HTTPLog.create(log)
            throw e
        }
    }
}
