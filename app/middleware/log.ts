/** @format */

import { UserContext } from '@interface/Context'

// handle and format user http request and response
export default function log() {
    return async (ctx: UserContext, next: () => Promise<any>) => {
        const { method, header, body, query, files, url, headers } = ctx.request
        const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || ctx.request.ip

        const [controller, action] = url.split(/[\/?]/).filter(item => item.trim() !== '')
        const userId = ctx.user?.id
        const res: StandardResponse = { status: 1, msg: '', data: null }
        try {
            await next()
            const { response } = ctx
            res.data = response.body.data || response.type
            res.msg = response.body.msg || response.message
        } catch (e) {
            res.status = 0
            res.msg = (e as Error).message
            throw e
        } finally {
            const { status, msg, data } = res
            const log = { userId, ip, method, header, body, query, files, status, data, msg, controller, action }
            ctx.model.HTTPLog.create(log)
        }
    }
}
