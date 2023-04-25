/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext } from '@eggjs/tegg'

@HTTPController({ path: '/index' })
export default class Index {
    @HTTPMethod({ path: '/', method: HTTPMethodEnum.GET })
    async index(@Context() ctx: EggContext) {
        await ctx.render('index/index.html')
    }
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.GET })
    async chat(@Context() ctx: EggContext) {
        await ctx.render('index/chat.html')
    }
}
