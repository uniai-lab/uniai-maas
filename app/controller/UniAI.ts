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
import { ChatCompletionRequestMessage, ImagesResponse } from 'openai'
import { authAdmin } from '@middleware/auth'
import { GLMChatResponse } from '@util/glm'
import { SDImagineResponse, SDTaskResponse } from '@util/sd'
import { GPTChatResponse } from '@util/openai'
import { SPKChatResponse } from '@util/fly'
import { Stream } from 'stream'
import { MJImagineResponse, MJTaskResponse } from '@util/mj'

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
            const model = params.model || AIModelEnum.GLM
            const { top, temperature, maxLength, subModel } = params
            const res = await ctx.service.uniAI.chat(prompts, false, model, top, temperature, maxLength, subModel)

            // chat to GPT
            if (model === AIModelEnum.GPT) {
                const { choices, model, object, usage } = res as GPTChatResponse
                if (choices[0].message?.content)
                    ctx.service.res.success('Success to chat to OpenAI GPT', {
                        content: choices[0].message.content,
                        promptTokens: usage?.prompt_tokens,
                        completionTokens: usage?.completion_tokens,
                        totalTokens: usage?.total_tokens,
                        model,
                        object
                    } as UniAIChatResponseData)
                else throw new Error('Error to chat to GPT')
            }
            // chat to GLM
            if (model === AIModelEnum.GLM) {
                const data = res as GLMChatResponse
                if (data.content)
                    ctx.service.res.success('Success to chat to GLM', {
                        content: data.content,
                        promptTokens: data.prompt_tokens,
                        completionTokens: data.completion_tokens,
                        totalTokens: data.total_tokens,
                        model: data.model,
                        object: data.object
                    } as UniAIChatResponseData)
                else throw new Error('Error to chat to GLM')
            }
            if (model === AIModelEnum.SPARK) {
                const { payload } = res as SPKChatResponse
                if (payload.choices.text[0].content)
                    ctx.service.res.success('Success to chat to IFLYTEK SPARK', {
                        content: payload.choices.text[0].content,
                        promptTokens: payload.usage?.text.prompt_tokens,
                        completionTokens: payload.usage?.text.completion_tokens,
                        totalTokens: payload.usage?.text.total_tokens
                    } as UniAIChatResponseData)
                else throw new Error('Error to chat to SPARK')
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
            if (!prompts.length) throw new Error('Empty prompts')
            const model = params.model || AIModelEnum.GLM
            const { top, temperature, maxLength, subModel, chunk } = params

            const res = await ctx.service.uniAI.chat(prompts, true, model, top, temperature, maxLength, subModel)

            ctx.body = ctx.service.uniAI.parseSSE(res as Stream, model, chunk)
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
    @HTTPMethod({ path: '/imagine', method: HTTPMethodEnum.POST })
    async imagine(@Context() ctx: EggContext, @HTTPBody() params: UniAIImaginePost) {
        try {
            const model = params.model || AIModelEnum.DALLE
            const { prompt, negativePrompt, num, width, height } = params
            if (!prompt) throw new Error('Prompt is empty')

            const res = await ctx.service.uniAI.imagine(prompt, negativePrompt, num, width, height, model)
            if (model === AIModelEnum.DALLE) {
                const { data } = res as ImagesResponse
                const images: string[] = []
                for (const item of data) if (item.url) images.push(item.url)
                ctx.service.res.success('Success text to image by DALL-E', { images } as UniAIImagineResponseData)
            } else if (model === AIModelEnum.SD) {
                const { images, info } = res as SDImagineResponse
                ctx.service.res.success('Success text to image by stable diffusion', {
                    images,
                    info
                } as UniAIImagineResponseData)
            } else {
                const { result, description, code } = res as MJImagineResponse
                if (code !== 1) throw new Error(description)
                ctx.service.res.success('Success text to image by MidJourney', {
                    images: [],
                    taskId: result,
                    info: description
                } as UniAIImagineResponseData)
            }
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/task', method: HTTPMethodEnum.POST })
    async task(@Context() ctx: EggContext, @HTTPBody() params: UniAITaskPost) {
        try {
            const { taskId, model } = params
            const res = await ctx.service.uniAI.task(taskId, model)
            if (!res.length) throw new Error('No Tasks found')
            if (model === AIModelEnum.MJ) {
                const tasks = res as MJTaskResponse[]
                if (taskId && tasks[0].failReason) throw new Error(tasks[0].failReason)
                const data: UniAITaskResponseData[] = tasks.map(v => {
                    return {
                        id: v.id,
                        progress: v.progress,
                        image: v.imageUrl,
                        info: v.description,
                        failReason: v.failReason
                    }
                })
                ctx.service.res.success('MidJourney task progress', data)
            } else if (model === AIModelEnum.SD) {
                const tasks = res as SDTaskResponse[]
                const data: UniAITaskResponseData[] = tasks.map(v => {
                    return {
                        progress: v.progress.toString(),
                        image: v.current_image,
                        info: v.textinfo
                    }
                })
                ctx.service.res.success('Stable Diffusion task progress', data)
            }
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    @Middleware(authAdmin())
    @HTTPMethod({ path: '/change', method: HTTPMethodEnum.POST })
    async change(@Context() ctx: EggContext, @HTTPBody() params: UniAIChangePost) {
        try {
            const { action, index, taskId } = params
            if (!taskId) throw new Error('Param taskId is null')
            if (!action) throw new Error('Param action is null')
            const model = params.model || AIModelEnum.MJ
            const res = await ctx.service.uniAI.change(taskId, action, index, model)
            if (model === AIModelEnum.MJ) {
                ctx.service.res.success('Success text to image by MidJourney', {
                    images: [],
                    taskId: res.result,
                    info: res.description
                } as UniAIImagineResponseData)
            }
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    @Middleware(authAdmin())
    @HTTPMethod({ path: '/queue', method: HTTPMethodEnum.POST })
    async queue(@Context() ctx: EggContext, @HTTPBody() params: { model: AIModelEnum }) {
        try {
            const model = params.model || AIModelEnum.MJ
            const res = await ctx.service.uniAI.queue(model)
            if (model === AIModelEnum.MJ) ctx.service.res.success('Image task queue', res)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
