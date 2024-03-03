/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Middleware } from '@eggjs/tegg'
import { Readable } from 'stream'
import {
    QueryResourceRequest,
    QueryResourceResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ImagineRequest,
    TaskRequest,
    ChatRequest,
    UploadRequest,
    UploadResponse,
    AuditRequest,
    ImgChangeRequest,
    QueryResourcesRequest,
    QueryResource
} from '@interface/controller/UniAI'
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
        const { top, temperature, maxLength, prompts, stream, provider, model } = params
        if (!prompts[0] || !prompts[0].content) throw new Error('Empty prompts')

        const res = await ctx.service.uniAI.chat(prompts, stream, provider, model, top, temperature, maxLength)
        ctx.service.res.success(`Success to chat`, res)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chatStream(@Context() ctx: EggContext, @HTTPBody() params: ChatRequest) {
        const { top, temperature, maxLength, prompts, provider, model } = params
        if (!prompts[0] || !prompts[0].content) throw new Error('Empty prompts')

        const res = await ctx.service.uniAI.chat(prompts, true, provider, model, top, temperature, maxLength)
        ctx.service.res.success(`Success to chat stream`, ctx.service.uniAI.concatChunk(res as Readable))
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/find-resources', method: HTTPMethodEnum.POST })
    async queryResources(@Context() ctx: EggContext, @HTTPBody() params: QueryResourcesRequest) {
        const { resourceId, maxPage, provider, input } = params
        if (!input.trim()) throw new Error('Empty query input')
        if (typeof resourceId === 'number' && !resourceId) throw new Error('Invalid resource id')
        else if (Array.isArray(resourceId) && !resourceId.length) throw new Error('Invalid resource ids')

        const data = await ctx.service.uniAI.queryResources(input, resourceId, provider, maxPage)

        ctx.service.res.success('Success to find resources', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/find-resource', method: HTTPMethodEnum.POST })
    async queryResource(@Context() ctx: EggContext, @HTTPBody() params: QueryResourceRequest) {
        const { resourceId, maxPage, provider } = params
        const prompts = params.prompts.map(v => v.content).filter(v => v)
        if (!prompts.length) throw new Error('Empty prompts')

        const data = await ctx.service.uniAI.queryResource(prompts, resourceId, provider, maxPage)
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
        const { provider, resourceId, content, fileName, filePath, fileExt, fileSize } = params

        const res = await ctx.service.uniAI.embeddingResource(
            provider,
            resourceId,
            content,
            fileName,
            filePath,
            fileExt,
            fileSize
        )
        const { id, page, tokens } = res.resource
        const embeddings1 = res.resource.embeddings1 || []
        const embeddings2 = res.resource.embeddings2 || []
        const data: EmbeddingResponse = {
            id,
            page,
            tokens,
            provider: res.provider,
            embedding: [
                ...embeddings1?.map(({ id, content, page, tokens, model }) => ({ id, content, page, tokens, model })),
                ...embeddings2?.map(({ id, content, page, tokens, model }) => ({ id, content, page, tokens, model }))
            ]
        }
        ctx.service.res.success('Success to embed text', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/imagine', method: HTTPMethodEnum.POST })
    async imagine(@Context() ctx: EggContext, @HTTPBody() params: ImagineRequest) {
        const { prompt, negativePrompt, num, width, height, provider, model } = params

        const res = await ctx.service.uniAI.imagine(prompt, negativePrompt, num, width, height, provider, model)

        ctx.service.res.success('Success to imagine', res)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/task', method: HTTPMethodEnum.POST })
    async task(@Context() ctx: EggContext, @HTTPBody() params: TaskRequest) {
        const { taskId, provider } = params

        const res = await ctx.service.uniAI.task(taskId, provider)

        ctx.service.res.success('Success to task progress', res)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/change', method: HTTPMethodEnum.POST })
    async change(@Context() ctx: EggContext, @HTTPBody() params: ImgChangeRequest) {
        const { action, index, taskId, provider } = params
        if (!taskId) throw new Error('taskId is null')
        if (!action) throw new Error('action is null')

        const res = await ctx.service.uniAI.change(taskId, action, index, provider)
        ctx.service.res.success('Success to image change', res)
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
