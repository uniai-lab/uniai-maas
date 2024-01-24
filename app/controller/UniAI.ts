/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Middleware } from '@eggjs/tegg'
import { Readable } from 'stream'
import { ModelProvider, EmbedModelEnum, ImgModelEnum } from '@interface/Enum'
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
    QueueRequest,
    UploadRequest,
    UploadResponse,
    AuditRequest
} from '@interface/controller/UniAI'
import { GPTImagineResponse } from '@interface/OpenAI'
import { MJImagineResponse, MJTaskResponse } from '@interface/MJ'
import { SDImagineResponse, SDTaskResponse } from '@interface/SD'
import auth from '@middleware/authB'
import log from '@middleware/log'
import transaction from '@middleware/transaction'
import $ from '@util/util'

@HTTPController({ path: '/ai' })
export default class UniAI {
    @Middleware()
    @HTTPMethod({ path: '/models', method: HTTPMethodEnum.GET })
    async models(@Context() ctx: EggContext) {
        const data = await ctx.service.uniAI.getModels()
        ctx.service.res.success(`Success to list models`, data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: EggContext, @HTTPBody() params: ChatRequest) {
        const { top, temperature, maxLength, prompts, stream, model } = params
        const provider = params.provider || ModelProvider.GLM
        if (!prompts[0] || !prompts[0].content) throw new Error('Empty prompts')

        const res = await ctx.service.uniAI.chat(prompts, stream, provider, model, top, temperature, maxLength)
        ctx.service.res.success(`Success to chat to ${model}`, res)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chatStream(@Context() ctx: EggContext, @HTTPBody() params: ChatRequest) {
        const { top, temperature, maxLength, prompts, model } = params
        const provider = params.provider || ModelProvider.GLM
        if (!prompts[0] || !prompts[0].content) throw new Error('Empty prompts')

        const res = await ctx.service.uniAI.chat(prompts, true, provider, model, top, temperature, maxLength)
        ctx.service.res.success(`Success to chat to ${model}`, ctx.service.uniAI.concatChunk(res as Readable))
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/find-resource', method: HTTPMethodEnum.POST })
    async queryResource(@Context() ctx: EggContext, @HTTPBody() params: QueryResourceRequest) {
        const { prompts, resourceId, maxPage, model } = params
        if (!prompts.length) throw new Error('Empty prompts')

        const data = await ctx.service.uniAI.queryResource(prompts, resourceId, model, maxPage)
        ctx.service.res.success('Success to find resources', data as QueryResourceResponse[])
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/upload', method: HTTPMethodEnum.POST })
    async upload(@Context() ctx: EggContext, @HTTPBody() params: UploadRequest) {
        const file = ctx.request.files[0]
        if (!file) throw new Error('No file')
        file.filename = params.fileName || file.filename

        const { id, content, fileName, filePath, fileSize, fileExt, page } = await ctx.service.uniAI.upload(file)
        const data: UploadResponse = { id, content, fileName, filePath, fileSize, fileExt, page }
        ctx.service.res.success('Success to upload resource', data)
    }

    @Middleware(auth(), log(), transaction())
    @HTTPMethod({ path: '/embedding-text', method: HTTPMethodEnum.POST })
    async embedding(@Context() ctx: EggContext, @HTTPBody() params: EmbeddingRequest) {
        const { resourceId, content, fileName, filePath, fileExt, fileSize } = params
        const model = params.model || EmbedModelEnum.TextVec // default: text2vec

        const res = await ctx.service.uniAI.embedding(model, resourceId, content, fileName, filePath, fileExt, fileSize)
        const { id, tokens, page } = res
        const data: EmbeddingResponse = { id, tokens, page, model }
        ctx.service.res.success('Success to embed text', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/imagine', method: HTTPMethodEnum.POST })
    async imagine(@Context() ctx: EggContext, @HTTPBody() params: ImagineRequest) {
        const { prompt, negativePrompt, num, width, height } = params
        const model = params.model || ImgModelEnum.MJ
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
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/task', method: HTTPMethodEnum.POST })
    async task(@Context() ctx: EggContext, @HTTPBody() params: TaskRequest) {
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
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/change', method: HTTPMethodEnum.POST })
    async change(@Context() ctx: EggContext, @HTTPBody() params: ImgChangeRequest) {
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
        ctx.service.res.success('Success to image change', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/queue', method: HTTPMethodEnum.POST })
    async queue(@Context() ctx: EggContext, @HTTPBody() params: QueueRequest) {
        const model = params.model || ImgModelEnum.MJ
        const res = await ctx.service.uniAI.queue(model)
        const data: TaskResponse[] = []
        if (model === ImgModelEnum.MJ)
            for (const { id, progress, imageUrl, description, failReason } of res)
                data.push({ id, progress, image: imageUrl, info: description, failReason })
        ctx.service.res.success('Success to image queue', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/audit', method: HTTPMethodEnum.POST })
    async contentCheck(@Context() ctx: EggContext, @HTTPBody() params: AuditRequest) {
        const { provider } = params
        const file = ctx.request.files[0]
        const content = file ? $.file2base64(file.filepath) : params.content

        const res = await ctx.service.uniAI.audit(content, provider)

        ctx.service.res.success('Success', res)
    }
}
