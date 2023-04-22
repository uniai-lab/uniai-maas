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
        const url = process.env.GLM_API as string
        return (await $.post(`${url}/embedding`, { prompt })) as Text2VecResponse
    }
}
