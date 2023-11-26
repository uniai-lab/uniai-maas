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
import { AIModelEnum, ChatModelEnum, ImgModelEnum } from '@interface/Enum'
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
    QueueRequest,
    UploadRequest,
    UploadResponse
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
            if (res instanceof Stream) ctx.body = ctx.service.uniAI.parseSSE(res, model, chunk)
            else if (model === ChatModelEnum.GPT) {
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
            } else if (model === ChatModelEnum.GLM) {
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
            } else if (model === ChatModelEnum.SPARK) {
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
    @HTTPMethod({ path: '/upload', method: HTTPMethodEnum.POST })
    async upload(@Context() ctx: EggContext, @HTTPBody() params: UploadRequest) {
        try {
            const file = ctx.request.files[0]
            if (!file) throw new Error('No file')
            file.filename = params.fileName || file.filename

            const { id, content, fileName, filePath, fileSize, fileExt, page } = await ctx.service.uniAI.upload(file)
            const data: UploadResponse = { id, content, fileName, filePath, fileSize, fileExt, page }
            ctx.service.res.success('Success to upload resource', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/embedding-text', method: HTTPMethodEnum.POST })
    async embedding(@Context() ctx: EggContext, @HTTPBody() params: EmbeddingRequest) {
        try {
            const { resourceId, content, fileName, filePath, fileExt, fileSize } = params
            const userId = 0
            const typeId = 1
            const model = params.model || AIModelEnum.GLM

            const { id, tokens, page } = await ctx.service.uniAI.embedding(
                model,
                resourceId,
                content,
                fileName,
                filePath,
                fileExt,
                fileSize,
                userId,
                typeId
            )
            const data: EmbeddingResponse = { id, tokens, page, model }
            ctx.service.res.success('Success to embed text', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/imagine', method: HTTPMethodEnum.POST })
    async imagine(@Context() ctx: EggContext, @HTTPBody() params: ImagineRequest) {
        try {
            const { prompt, negativePrompt, num, width, height } = params
            const model = params.model || ImgModelEnum.DALLE
            if (!prompt) throw new Error('Prompt is empty')

            const res = await ctx.service.uniAI.imagine(prompt, negativePrompt, num, width, height, model)
            const data: ImagineResponse = { images: [], model, info: '', taskId: '' }

            if (model === ImgModelEnum.DALLE) {
                const images: string[] = []
                for (const item of (res as GPTImagineResponse).data) if (item.url) images.push(item.url)
                data.images = images
            }
            if (model === ImgModelEnum.SD) {
                const { images, info } = res as SDImagineResponse
                data.images = images
                data.info = info
            }
            if (model === ImgModelEnum.MJ) {
                const { result, description } = res as MJImagineResponse
                data.taskId = result
                data.info = description
            }
            ctx.service.res.success('Success to imagine', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/task', method: HTTPMethodEnum.POST })
    async task(@Context() ctx: EggContext, @HTTPBody() params: TaskRequest) {
        try {
            const { taskId } = params
            const model = params.model || ImgModelEnum.MJ

            const res = await ctx.service.uniAI.task(taskId, model)
            if (!res.length) throw new Error('Task not found')

            const data: TaskResponse[] = []
            if (model === ImgModelEnum.MJ) {
                const tasks = res as MJTaskResponse[]
                if (tasks[0].failReason) throw new Error(tasks[0].failReason)
                for (const { id, progress, imageUrl, description, failReason } of tasks)
                    data.push({
                        id,
                        progress,
                        image: imageUrl,
                        info: description,
                        failReason
                    })
            }
            if (model === ImgModelEnum.SD) {
                const tasks = res as SDTaskResponse[]
                for (const v of tasks)
                    data.push({
                        id: v.current_image || '',
                        progress: v.progress.toString(),
                        image: v.current_image || null,
                        info: v.textinfo || '',
                        failReason: v.textinfo || null
                    })
            }
            ctx.service.res.success('Success to task progress', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    @Middleware(authAdmin())
    @HTTPMethod({ path: '/change', method: HTTPMethodEnum.POST })
    async change(@Context() ctx: EggContext, @HTTPBody() params: ImgChangeRequest) {
        try {
            const { action, index, taskId } = params
            const model = params.model || ImgModelEnum.MJ
            if (!taskId) throw new Error('taskId is null')
            if (!action) throw new Error('action is null')

            const res = await ctx.service.uniAI.change(taskId, action, index, model)
            const data: ImagineResponse = { images: [], taskId: '', info: '', model }
            if (model === ImgModelEnum.MJ) {
                data.taskId = res.result
                data.info = res.description
            }
            ctx.service.res.success('Success image change', res)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    @Middleware(authAdmin())
    @HTTPMethod({ path: '/queue', method: HTTPMethodEnum.POST })
    async queue(@Context() ctx: EggContext, @HTTPBody() params: QueueRequest) {
        try {
            const model = params.model || ImgModelEnum.MJ
            const res = await ctx.service.uniAI.queue(model)
            const data: TaskResponse[] = []
            if (model === ImgModelEnum.MJ) {
                for (const { id, progress, imageUrl, description, failReason } of res)
                    data.push({ id, progress, image: imageUrl, info: description, failReason })
            }
            ctx.service.res.success('Success image queue', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
