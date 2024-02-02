/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody } from '@eggjs/tegg'
import { CreatePayRequest } from '@interface/controller/Pay'

@HTTPController({ path: '/pay' })
export default class Pay {
    // wechat pay callback
    @HTTPMethod({ path: '/wx', method: HTTPMethodEnum.GET })
    async index(@Context() ctx: EggContext) {
        await ctx.render('index/index.html')
    }

    // create pay
    @HTTPMethod({ path: '/create', method: HTTPMethodEnum.POST })
    async create(@Context() ctx: EggContext, @HTTPBody() params: CreatePayRequest) {
        const { id, type } = params
        const res = await ctx.service.pay.create(id, type)
        ctx.service.res.success('Success to create pay', res)
    }
}
