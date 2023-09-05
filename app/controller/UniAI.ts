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
import {
    ChatCompletionRequestMessage,
    CreateChatCompletionResponse,
    CreateImageRequestResponseFormatEnum,
    ImagesResponse
} from 'openai'
import { IncomingMessage } from 'http'
import { authAdmin } from '@middleware/auth'
import { GLMChatResponse } from '@util/glm'
import { Txt2ImgResponse } from '@util/sd'

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
                    params.temperature,
                    params.maxLength,
                    params.subModel
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
                params.maxLength,
                params.subModel
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
            const { prompts, resourceId, maxPage, model } = params
            if (!prompts.length) throw new Error('Empty prompts')

            const data = await ctx.service.uniAI.queryResource(
                prompts as ChatCompletionRequestMessage[],
                resourceId,
                maxPage,
                model
            )
            ctx.service.res.success('Success to find resources', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/embedding-text', method: HTTPMethodEnum.POST })
    async embedding(@Context() ctx: EggContext, @HTTPBody() params: UniAIEmbeddingPost) {
        try {
            const { content, fileName, filePath, fileSize, model, id } = params
            const userId = 0
            const typeId = 1
            if (id) {
                // update
                const res = await ctx.service.uniAI.updateEmbedding(id, model, userId)
                if (!res) throw new Error('Fail to update resource embedding')
                ctx.service.res.success('Success to embed text', {
                    id: res.id,
                    tokens: res.tokens,
                    page: res.page
                } as UniAIEmbeddingResponseData)
            } else {
                // insert
                if (!content) throw new Error('content is null')
                if (!fileName) throw new Error('file name is null')
                if (!filePath) throw new Error('file path is null')
                if (!fileSize) throw new Error('file size is not valid')

                const res = await ctx.service.uniAI.createEmbedding(
                    content,
                    fileName,
                    filePath,
                    fileSize,
                    model,
                    userId,
                    typeId
                )
                if (!res) throw new Error('Fail to create resource embedding')
                ctx.service.res.success('Success to embed text', {
                    id: res.id,
                    tokens: res.tokens,
                    page: res.page
                } as UniAIEmbeddingResponseData)
            }
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/txt-to-img', method: HTTPMethodEnum.POST })
    async txt2img(@Context() ctx: EggContext, @HTTPBody() params: UniAITxt2ImgPost) {
        try {
            if (!params.prompt) throw new Error('Prompt is empty')
            params.model = params.model || 'DALLE'

            const res = await ctx.service.uniAI.txt2img(
                params.prompt,
                params.negativePrompt,
                params.num,
                params.width,
                params.height,
                params.format as CreateImageRequestResponseFormatEnum,
                params.model
            )
            if (params.model === 'SD') {
                const { images, info } = { ...(res as Txt2ImgResponse) }
                ctx.service.res.success('Success text to image', { images, info } as UniAITxt2ImgResponseData)
            } else if (params.model === 'DALLE') {
                const { data, created } = { ...(res as ImagesResponse) }
                const images: string[] = []
                for (const item of data) {
                    if (item.b64_json) images.push(item.b64_json)
                    if (item.url) images.push(item.url)
                }
                const info = `${new Date(created * 1000)}: ${params.prompt}`
                ctx.service.res.success('Success text to image', { images, info } as UniAITxt2ImgResponseData)
            }
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
