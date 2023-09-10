/** @format */

import {
    HTTPController,
    HTTPMethod,
    HTTPMethodEnum,
    Context,
    EggContext,
    HTTPBody,
    Middleware,
    Inject
} from '@eggjs/tegg'
import { authAdmin } from '@middleware/auth'
import { Stream } from 'stream'

@HTTPController({ path: '/long' })
export default class LongText {
    @Inject()
    logger: EggContext

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/outline', method: HTTPMethodEnum.POST })
    async outline(@Context() ctx: EggContext, @HTTPBody() params: LongTextOutlinePost) {
        try {
            if (!params.major.trim()) throw new Error('no major')
            if (!params.role.trim()) throw new Error('no role')
            if (!params.task.trim()) throw new Error('no task')
            if (!params.topic.trim()) throw new Error('no topic')
            params.model = params.model || 'GLM'
            params.language = params.language || ctx.__('chinese')

            const res = await ctx.service.prompt.outline({ ...params })
            ctx.body = ctx.service.uniAI.parseSSE(res as Stream, params.model)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}

interface LongTextOutlinePost {
    model: AIModelEnum
    major: string
    role: string
    task: string
    topic: string
    language: string
}
