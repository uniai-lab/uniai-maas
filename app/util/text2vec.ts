/** @format */
import { EggContext } from '@eggjs/tegg'
import { CreateEmbeddingRequestInput } from 'openai'
import $ from '@util/util'

export default {
    async log(ctx: EggContext, userId: number, log: Text2VecResponse, message?: string) {
        return await ctx.model.OpenAILog.create({
            model: log.model,
            userId,
            object: log.object,
            message
        })
    },
    async embedding(prompt: CreateEmbeddingRequestInput) {
        return (await $.post(`${process.env.GLM_API}/embedding`, { prompt })) as Text2VecResponse
    }
}
