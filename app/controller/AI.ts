/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody } from '@eggjs/tegg'
/*
import embed from '@util/embed'
import math from '@util/math'
import openai from '@util/openai'
*/

@HTTPController({ path: '/api' })
export default class API {
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.GET })
    async chat(@Context() ctx: EggContext) {
        await ctx.render('index/index.html')
    }
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.GET })
    async chatStream(@Context() ctx: EggContext) {
        await ctx.render('index/chat.html')
    }
}
