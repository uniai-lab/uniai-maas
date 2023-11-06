/** @format */

import { EggLogger } from 'egg'
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
import { ImgModelEnum } from '@interface/Enum'
import {
    QueryResourceRequest,
    QueryResourceResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ImagineRequest,
    ImagineResponse,
    TaskRequest,
    TaskResponse,
    ImgChangeRequest,
    ChatRequest,
    ChatResponse,
    QueueRequest
} from '@interface/controller/UniAI'
import { GPTChatResponse, GPTImagineResponse } from '@interface/OpenAI'
import { GLMChatResponse } from '@interface/GLM'
import { SPKChatResponse } from '@interface/Spark'
import { MJImagineResponse, MJTaskResponse } from '@interface/MJ'
import { SDImagineResponse, SDTaskResponse } from '@interface/SD'

@HTTPController({ path: '/ai' })
export default class UniAI {
    @Inject()
    logger: EggLogger

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: EggContext, @HTTPBody() params: ChatRequest) {
        try {
            const { top, temperature, maxLength, model, subModel, prompts, chunk, stream } = params
            if (!prompts.length) throw new Error('Empty prompts')

            const res = await ctx.service.uniAI.chat(prompts, stream, model, top, temperature, maxLength, subModel)
            if (stream) ctx.body = ctx.service.uniAI.parseSSE(res as Stream, model, chunk)
            else if (model === 'GPT') {
                // chat to GPT
                const { choices, model, object, usage } = res as GPTChatResponse
                if (choices[0].message?.content)
                    ctx.service.res.success('Success to chat to OpenAI/GPT', {
                        content: choices[0].message.content,
                        promptTokens: usage?.prompt_tokens,
                        completionTokens: usage?.completion_tokens,
                        totalTokens: usage?.total_tokens,
                        model,
                        object
                    } as ChatResponse)
                else throw new Error('Error to chat to GPT')
            } else if (model === 'GLM') {
                // chat to GLM
                const { choices, model, object, usage } = res as GLMChatResponse
                if (choices[0].message?.content)
                    ctx.service.res.success('Success to chat to THUDM/GLM', {
                        content: choices[0].message.content,
                        promptTokens: usage?.prompt_tokens,
                        completionTokens: usage?.completion_tokens,
                        totalTokens: usage?.total_tokens,
                        model,
                        object
                    } as ChatResponse)
                else throw new Error('Error to chat to GLM')
            } else if (model === 'SPARK') {
                // chat to SPARK
                const { payload } = res as SPKChatResponse
                if (payload.choices.text[0].content)
                    ctx.service.res.success('Success to chat to iFlyTek/SPARK', {
                        content: payload.choices.text[0].content,
                        promptTokens: payload.usage?.text.prompt_tokens,
                        completionTokens: payload.usage?.text.completion_tokens,
                        totalTokens: payload.usage?.text.total_tokens,
                        model: payload.model,
                        object: payload.object
                    } as ChatResponse)
                else throw new Error('Error to chat to SPARK')
            }
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error, params.stream)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chatStream(@Context() ctx: EggContext, @HTTPBody() params: ChatRequest) {
        try {
            const { prompts, top, temperature, maxLength, model, subModel, chunk } = params
            if (!prompts.length) throw new Error('Empty prompts')

            const res = await ctx.service.uniAI.chat(prompts, true, model, top, temperature, maxLength, subModel)

            ctx.body = ctx.service.uniAI.parseSSE(res as Stream, model, chunk)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error, true)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/find-resource', method: HTTPMethodEnum.POST })
    async queryResource(@Context() ctx: EggContext, @HTTPBody() params: QueryResourceRequest) {
        try {
            const { prompts, resourceId, maxPage, maxToken, model } = params
            if (!prompts.length) throw new Error('Empty prompts')

            const data = await ctx.service.uniAI.queryResource(prompts, resourceId, model, maxPage, maxToken)
            ctx.service.res.success('Success to find resources', data as QueryResourceResponse[])
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/embedding-text', method: HTTPMethodEnum.POST })
    async embedding(@Context() ctx: EggContext, @HTTPBody() params: EmbeddingRequest) {
        try {
            const { content, fileName, filePath, fileSize, model, id } = params
            const userId = 0
            const typeId = 1

            const res = await ctx.service.uniAI.embedding(
                model,
                id,
                content,
                fileName,
                filePath,
                fileSize,
                userId,
                typeId
            )
            ctx.service.res.success('Success to embed context', {
                id: res.id,
                tokens: res.tokens,
                page: res.page
            } as EmbeddingResponse)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/imagine', method: HTTPMethodEnum.POST })
    async imagine(@Context() ctx: EggContext, @HTTPBody() params: ImagineRequest) {
        try {
            const { prompt, negativePrompt, num, width, height, model } = params
            if (!prompt) throw new Error('Prompt is empty')

            const res = await ctx.service.uniAI.imagine(prompt, negativePrompt, num, width, height, model)

            if (model === ImgModelEnum.DALLE) {
                const { data } = res as GPTImagineResponse
                const images: string[] = []
                for (const item of data) if (item.url) images.push(item.url)
                ctx.service.res.success('Success to imagine by DALL-E', {
                    images,
                    taskId: '',
                    info: ''
                } as ImagineResponse)
            }
            if (model === ImgModelEnum.SD) {
                const { images, info } = res as SDImagineResponse
                ctx.service.res.success('Success to imagine by Stable Diffusion', {
                    images,
                    taskId: '',
                    info
                } as ImagineResponse)
            }
            if (model === ImgModelEnum.MJ) {
                const { result, description, code } = res as MJImagineResponse
                if (code !== 1) throw new Error(description)
                ctx.service.res.success('Success to imagine by MidJourney', {
                    images: [],
                    taskId: result,
                    info: description
                } as ImagineResponse)
            }
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/task', method: HTTPMethodEnum.POST })
    async task(@Context() ctx: EggContext, @HTTPBody() params: TaskRequest) {
        try {
            const { taskId, model } = params
            const res = await ctx.service.uniAI.task(taskId, model)
            if (!res.length) throw new Error('No Tasks found')

            if (model === 'MJ') {
                const tasks = res as MJTaskResponse[]
                if (taskId && tasks[0].failReason) throw new Error(tasks[0].failReason)
                const data: TaskResponse[] = tasks.map(v => {
                    return {
                        id: v.id,
                        progress: v.progress,
                        image: v.imageUrl,
                        info: v.description,
                        failReason: v.failReason
                    }
                })
                ctx.service.res.success('MidJourney task progress', data)
            }
            if (model === 'SD') {
                const tasks = res as SDTaskResponse[]
                const data: TaskResponse[] = tasks.map(v => {
                    return {
                        id: v.current_image || '',
                        progress: v.progress.toString(),
                        image: v.current_image || null,
                        info: v.textinfo || '',
                        failReason: v.textinfo || null
                    }
                })
                ctx.service.res.success('Stable Diffusion task progress', data)
            }
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    @Middleware(authAdmin())
    @HTTPMethod({ path: '/change', method: HTTPMethodEnum.POST })
    async change(@Context() ctx: EggContext, @HTTPBody() params: ImgChangeRequest) {
        try {
            const { action, index, taskId, model } = params
            if (!taskId) throw new Error('taskId is null')
            if (!action) throw new Error('action is null')

            const res = await ctx.service.uniAI.change(taskId, action, index, model)
            if (model === 'MJ') {
                ctx.service.res.success('Success text to image by MidJourney', {
                    images: [],
                    taskId: res.result,
                    info: res.description
                } as ImagineResponse)
            }
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    @Middleware(authAdmin())
    @HTTPMethod({ path: '/queue', method: HTTPMethodEnum.POST })
    async queue(@Context() ctx: EggContext, @HTTPBody() params: QueueRequest) {
        try {
            const model = params.model || 'MJ'
            const res = await ctx.service.uniAI.queue(model)
            if (model === 'MJ') ctx.service.res.success('Image task queue', res)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
