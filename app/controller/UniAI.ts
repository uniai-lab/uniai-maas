/** @format */

import {
    HTTPController,
    HTTPMethod,
    HTTPMethodEnum,
    Context,
    EggContext,
    HTTPBody,
    Inject,
    Middleware
} from '@eggjs/tegg'
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai'
import { IncomingMessage } from 'http'
import { authAdmin } from '@middleware/auth'
import { GLMChatResponse } from '@util/glm'
import $ from '@util/util'

@HTTPController({ path: '/ai' })
export default class UniAI {
    @Inject()
    logger: EggContext

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: EggContext, @HTTPBody() params: UniAIChatPost) {
        try {
            const prompts = params.prompts as ChatCompletionRequestMessage[]
            if (!params.prompts.length) throw new Error('Empty prompts')
            const model = params.model || 'GLM'
            // chat to GPT
            if (model === 'GPT') {
                const res = (await ctx.service.uniAI.chat(
                    prompts,
                    false,
                    params.model,
                    params.top,
                    params.temperature
                )) as CreateChatCompletionResponse
                if (res.choices[0].message?.content)
                    ctx.service.res.success('Success to chat to GPT', {
                        content: res.choices[0].message.content,
                        promptTokens: res.usage?.prompt_tokens,
                        completionTokens: res.usage?.completion_tokens,
                        totalTokens: res.usage?.total_tokens,
                        model: res.model,
                        object: res.object
                    } as UniAIChatResponseData)
                else throw new Error('Error to chat to GPT')
            }
            // chat to GLM
            if (model === 'GLM') {
                const res = (await ctx.service.uniAI.chat(
                    prompts,
                    false,
                    params.model,
                    params.top,
                    params.temperature,
                    params.maxLength
                )) as GLMChatResponse
                if (res.content)
                    ctx.service.res.success('Success to chat to GLM', {
                        content: res.content,
                        promptTokens: res.prompt_tokens,
                        completionTokens: res.completion_tokens,
                        totalTokens: res.total_tokens,
                        model: res.model,
                        object: res.object
                    } as UniAIChatResponseData)
                else throw new Error('Error to chat to GLM')
            }
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chatStream(@Context() ctx: EggContext, @HTTPBody() params: UniAIChatPost) {
        try {
            const prompts = params.prompts as ChatCompletionRequestMessage[]
            if (!params.prompts.length) throw new Error('Empty prompts')
            const model = params.model || 'GLM'
            const chunk = params.chunk || false

            const res = await ctx.service.uniAI.chat(
                prompts,
                true,
                model,
                params.top,
                params.temperature,
                params.maxLength
            )

            ctx.body = ctx.service.uniAI.parseStream(res as IncomingMessage, model, chunk)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/find-resource', method: HTTPMethodEnum.POST })
    async queryResource(@Context() ctx: EggContext, @HTTPBody() params: UniAIQueryResourcePost) {
        try {
            const prompts = params.prompts as ChatCompletionRequestMessage[]
            if (!params.prompts.length) throw new Error('Empty prompts')
            const { pages, embed, model } = await ctx.service.uniAI.queryResource(
                prompts,
                params.resourceId,
                params.maxPage,
                params.maxToken,
                params.model
            )
            const data = pages.map(v => {
                let embedding = v.embedding2 // default text2vector (GLM)
                if (params.model === 'GPT') embedding = v.embedding
                if (params.model === 'GLM') embedding = v.embedding2
                return { content: v.content, similar: $.cosine(embedding, embed), model }
            })
            ctx.service.res.success('Success to find resources content', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/embedding-text', method: HTTPMethodEnum.POST })
    async embedding(@Context() ctx: EggContext, @HTTPBody() params: UniAIEmbeddingPost) {
        try {
            if (!params.content) throw new Error('content is null')
            if (!params.fileName) throw new Error('file name is null')
            if (!params.filePath) throw new Error('file path is null')
            if (!params.fileSize) throw new Error('file size is not valid')

            const res = await ctx.service.uniAI.embedding(
                params.content,
                params.fileName,
                params.filePath,
                params.fileSize,
                params.model
            )
            if (!res) throw new Error('Fail to embed text')
            const data: UniAIEmbeddingResponseData = {
                id: res.id,
                promptTokens: res.promptTokens,
                totalTokens: res.totalTokens,
                page: res.page
            }
            ctx.service.res.success('Success to embed text', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    @Middleware(authAdmin())
    @HTTPMethod({ path: '/txt-to-img', method: HTTPMethodEnum.POST })
    async txt2img(@Context() ctx: EggContext, @HTTPBody() params: UniAITxt2ImgPost) {
        try {
            const res = await ctx.service.uniAI.txt2img(
                params.prompt,
                params.negativePrompt,
                params.width,
                params.height
            )
            const data: UniAITxt2ImgResponseData = {
                images: res.images,
                info: res.info
            }
            ctx.service.res.success('Success text to image', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    @Middleware(authAdmin())
    @HTTPMethod({ path: '/img-progress', method: HTTPMethodEnum.POST })
    async progress(@Context() ctx: EggContext) {
        try {
            const res = await ctx.service.uniAI.progress()
            const data: UniAIImgProgressResponseData = {
                progress: res.progress,
                etaRelative: res.eta_relative,
                image: res.current_image,
                txt: res.textinfo
            }
            ctx.service.res.success('Image progress', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
