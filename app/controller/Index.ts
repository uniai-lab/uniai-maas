/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody } from '@eggjs/tegg'
/*
import embed from '@util/embed'
import math from '@util/math'
import openai from '@util/openai'
*/

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
    /*
    @HTTPMethod({ path: '/list-models', method: HTTPMethodEnum.GET })
    async list() {
        try {
            const res = await openai.listModels()
            return { status: 1, data: res.data, msg: 'list models' }
        } catch (e) {
            return { status: 0, data: null, msg: (e as Error).message }
        }
    }
    @HTTPMethod({ path: '/embedding', method: HTTPMethodEnum.POST })
    async embedding(@HTTPBody() params: EmbeddingPost) {
        try {
            const res = await openai.embedding(params.input)
            return { status: 1, data: res.data, msg: `input: ${params.input}` }
        } catch (e) {
            return { status: 0, data: null, msg: (e as Error).message }
        }
    }
    @HTTPMethod({ path: '/similarity', method: HTTPMethodEnum.POST })
    async similarity(@HTTPBody() params: SimilarityPost) {
        try {
            const arr = [params.inputA, params.inputB]
            console.log(arr)
            console.log('GPT is embedding...')
            const res = await openai.embedding(arr)
            console.log('USE is embedding...')
            const data = await embed.use(arr)
            const USE = math.similarity(data[0], data[1])
            console.log('USE', USE)
            const GPT = math.similarity(res.data[0].embedding, res.data[1].embedding)
            console.log('GPT', GPT)
            return { status: 1, data: { USE, GPT }, msg: [params.inputA, params.inputB] }
        } catch (e) {
            return { status: 0, data: null, msg: (e as Error).message }
        }
    }
    */
}
