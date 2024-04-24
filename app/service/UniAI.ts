/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { statSync } from 'fs'
import { EggFile } from 'egg-multipart'
import { extname } from 'path'
import { PassThrough, Readable } from 'stream'
import { AIAuditResponse, AuditResponse, QueryResource, ResourcePage } from '@interface/controller/UniAI'
import AI, {
    ChatMessage,
    ChatModel,
    ChatModelProvider,
    ChatResponse,
    ChatRoleEnum,
    EmbedModelProvider,
    GLMChatModel,
    ImagineModel,
    ImagineModelProvider,
    MJTaskType,
    ModelProvider
} from 'uniai'
import { AuditProvider, ResourceType } from '@interface/Enum'
import userResourceTab from '@data/userResourceTab'
import fly from '@util/fly'
import $ from '@util/util'
import { encode } from 'gpt-tokenizer'
import { literal } from 'sequelize'

const {
    OPENAI_API,
    OPENAI_KEY,
    GOOGLE_AI_API,
    GOOGLE_AI_KEY,
    ZHIPU_AI_KEY,
    GLM_API,
    FLY_API_KEY,
    FLY_API_SECRET,
    FLY_APP_ID,
    BAIDU_API_KEY,
    BAIDU_SECRET_KEY,
    MOONSHOT_KEY,
    MJ_API,
    MJ_TOKEN,
    MJ_IMG_PROXY,
    STABILITY_KEY
} = process.env

const ai = new AI({
    OpenAI: { key: OPENAI_KEY.split(','), proxy: OPENAI_API },
    Google: { key: GOOGLE_AI_KEY.split(','), proxy: GOOGLE_AI_API },
    GLM: { key: ZHIPU_AI_KEY.split(','), local: GLM_API },
    IFlyTek: { apiKey: FLY_API_KEY, apiSecret: FLY_API_SECRET, appId: FLY_APP_ID },
    Baidu: { apiKey: BAIDU_API_KEY, secretKey: BAIDU_SECRET_KEY },
    MoonShot: { key: MOONSHOT_KEY.split(',') },
    Other: { api: GLM_API },
    MidJourney: { proxy: MJ_API, token: MJ_TOKEN, imgProxy: MJ_IMG_PROXY },
    StabilityAI: { key: STABILITY_KEY }
})

const MAX_PAGE = 10
const DEFAULT_RESOURCE_TAB = userResourceTab[0].id
const SIMILAR_DISTANCE = 0.000001
const LIMIT_IMG_SIZE = 1 * 1024 * 1024 // image over 1mb need compress

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class UniAI extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        const { app, ctx } = this
        let value = await app.redis.get(key)
        if (!value) {
            // config not in cache
            const res = await ctx.model.Config.findOne({ attributes: ['value'], where: { key } })
            if (res && res.value) {
                await app.redis.set(key, res.value)
                value = res.value
            } else throw new Error(`Config: ${key} not found`)
        }
        return $.json<T>(value) || (value as T)
    }

    // list all chat models
    getChatModels() {
        return ai.chatModels
    }

    // query from one resource
    async queryResource(
        input: string | string[],
        resourceId?: number,
        provider: EmbedModelProvider = EmbedModelProvider.Other,
        limit: number = MAX_PAGE
    ) {
        const { ctx } = this

        const where: { resourceId?: number } = {}
        // give specific resource id
        if (resourceId) {
            // check resource exist
            const resource = await ctx.model.Resource.count({ where: { id: resourceId } })
            if (!resource) throw new Error('Resource not found')
            where.resourceId = resourceId

            // check embeddings exist
            let count = 0
            if (provider === EmbedModelProvider.OpenAI) count = await ctx.model.Embedding1.count({ where })
            else if (provider === EmbedModelProvider.Other) count = await ctx.model.Embedding2.count({ where })
            else throw new Error('Model provider not support')

            // embedding not exist, create embeddings
            if (!count) await this.embeddingResource(provider, resourceId)
        }

        const pages: ResourcePage[] = []

        if (typeof input === 'string') input = [input]
        for (const content of input) {
            if (typeof content !== 'string' || !content) continue
            const query = content.trim()
            const data = await this.embedding(query, provider)
            const embedding = data.embedding[0]

            if (provider === EmbedModelProvider.OpenAI) {
                const res = await ctx.model.Embedding1.similarFindAll(embedding, limit, where)
                for (const item of resourceId ? res.sort((a, b) => a.page - b.page) : res)
                    pages.push({
                        id: item.id,
                        resourceId: item.resourceId,
                        page: item.page,
                        model: item.model,
                        content: item.content,
                        similar: $.cosine(embedding, item.embedding || [])
                    })
            } else if (provider === ModelProvider.Other) {
                const res = await ctx.model.Embedding2.similarFindAll(embedding, limit, where)
                for (const item of resourceId ? res.sort((a, b) => a.page - b.page) : res)
                    pages.push({
                        id: item.id,
                        resourceId: item.resourceId,
                        page: item.page,
                        model: item.model,
                        content: item.content,
                        similar: $.cosine(embedding, item.embedding || [])
                    })
            } else throw new Error('Embedding provider and model not found')
        }

        return pages
    }

    // query from multi resources
    async queryResources(
        input: string,
        resourceId: number | number[],
        provider: EmbedModelProvider = EmbedModelProvider.Other,
        limit: number = MAX_PAGE
    ) {
        const { ctx } = this
        const vector = await this.embedding(input, provider)
        const id = typeof resourceId === 'number' ? [resourceId] : resourceId
        const resources = await ctx.model.Resource.findAll({
            where: { id },
            attributes: ['id', 'page', 'fileName', 'fileSize', 'filePath'],
            include: {
                model: provider === EmbedModelProvider.OpenAI ? ctx.model.Embedding1 : ctx.model.Embedding2,
                order: literal(`embedding <=> '${JSON.stringify(vector.embedding[0])}' ASC`),
                attributes: ['id', 'page', 'content', 'tokens', 'embedding', 'model'],
                limit
            }
        })
        return resources
            .map<QueryResource>(({ id, page, fileName, fileSize, filePath, embeddings1, embeddings2 }) => ({
                id,
                page,
                fileName,
                filePath,
                fileSize,
                pages: [
                    ...(embeddings1 || []).map(({ id, page, content, tokens, embedding, model }) => ({
                        id,
                        page,
                        content,
                        tokens,
                        model,
                        similar: $.cosine(vector.embedding[0], embedding || [])
                    })),
                    ...(embeddings2 || []).map(({ id, page, content, tokens, embedding, model }) => ({
                        id,
                        page,
                        content,
                        tokens,
                        model,
                        similar: $.cosine(vector.embedding[0], embedding || [])
                    }))
                ].sort((a, b) => a.page - b.page),
                provider
            }))
            .sort((a, b) => id.indexOf(a.id) - id.indexOf(b.id))
    }

    // chat to model
    async chat(
        messages: ChatMessage[],
        stream: boolean = false,
        provider: ChatModelProvider = ChatModelProvider.OpenAI,
        model?: ChatModel,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        return ai.chat(messages, { provider, model, stream, top, temperature, maxLength })
    }

    // concat chat stream chunk
    concatChunk(input: Readable) {
        const output = new PassThrough()

        let content = ''
        input.on('data', (e: Buffer) => {
            const data = $.json<ChatResponse>(e.toString())
            if (data) {
                data.content = content += data.content
                output.write(JSON.stringify(data))
            }
        })

        input.on('error', e => output.destroy(e))
        input.on('end', () => output.end())

        return output as Readable
    }

    // upload file
    async upload(
        file: EggFile,
        userId?: number,
        typeId: number = ResourceType.TEXT,
        tabId: number = DEFAULT_RESOURCE_TAB
    ) {
        const { ctx } = this
        const { transaction } = ctx

        // limit upload file size
        let fileName = file.filename
        let filePath = file.filepath
        let fileSize = statSync(filePath).size
        let fileExt = extname(filePath).replace('.', '').toLowerCase()
        let content = ''
        let embedding: number[] | null = null
        if (['png', 'jpg', 'jpeg', 'webp'].includes(fileExt)) typeId = ResourceType.IMAGE

        // compress image
        if (typeId === ResourceType.IMAGE && fileSize > LIMIT_IMG_SIZE) {
            const path = await ctx.service.util.compressImage(file.filepath)
            filePath = path
            fileSize = statSync(filePath).size
            fileExt = extname(filePath).replace('.', '').toLowerCase()
            fileName = fileName.replace(extname(fileName), `.${fileExt}`) // replace file name ext
        }
        // extract content
        if (typeId === ResourceType.TEXT) {
            content = await ctx.service.util.extractText(filePath)
            embedding = content ? encode(content).concat(new Array(1024).fill(0)).slice(0, 1024) : null
        }

        // find similar or create new resource
        return (
            (embedding &&
                (await ctx.model.Resource.findOne({
                    where: literal(`embedding <=> '${JSON.stringify(embedding)}' < ${SIMILAR_DISTANCE}`),
                    transaction
                }))) ||
            (await ctx.model.Resource.create(
                {
                    content,
                    userId,
                    typeId,
                    tabId,
                    embedding,
                    fileName,
                    filePath: await ctx.service.util.putOSS(filePath),
                    fileSize,
                    fileExt,
                    tokens: $.countTokens(content)
                },
                { transaction }
            ))
        )
    }

    // simply embedding string or array of string
    async embedding(input: string | string[], provider: EmbedModelProvider = EmbedModelProvider.Other) {
        return await ai.embedding(input, { provider })
    }

    // create embedding for text content
    async embeddingResource(
        provider: EmbedModelProvider = EmbedModelProvider.Other,
        resourceId?: number,
        content?: string,
        fileName?: string,
        filePath?: string,
        fileExt?: string,
        fileSize?: number,
        userId: number = 0,
        typeId: number = ResourceType.TEXT,
        tabId: number = DEFAULT_RESOURCE_TAB,
        reset: boolean = false
    ) {
        const { ctx } = this
        const { transaction } = ctx

        if (!resourceId) {
            if (!content) throw new Error('File content is empty')
            if (!fileName) throw new Error('File name is empty')
            if (!filePath) throw new Error('File path is empty')
            if (!fileSize) throw new Error('File size is empty')
            fileExt = fileExt || extname(filePath).replace('.', '')
            if (!fileExt) throw new Error('Can not detect file extension')
            content = $.tinyText(content)
        }

        // find or create a resource
        const resource = resourceId
            ? await ctx.model.Resource.findByPk(resourceId, { transaction })
            : await ctx.model.Resource.create(
                  { content, typeId, tabId, userId, fileName, filePath, fileSize, fileExt },
                  { transaction }
              )

        if (!resource) throw new Error('Can not create or find resource by id')
        if (!resource.content) throw new Error('Can not extract content from resource')

        if (provider === EmbedModelProvider.OpenAI) {
            resource.embeddings1 = await ctx.model.Embedding1.findAll({ where: { resourceId }, transaction })

            if (!resource.embeddings1.length || reset) {
                // extract page of content from the file
                const path = await ctx.service.util.getFile(resource.filePath)
                const pages = await ctx.service.util.extractPages(path)
                resource.page = pages.length
                resource.tokens = $.countTokens(resource.content)
                if (reset) await ctx.model.Embedding1.destroy({ where: { resourceId }, transaction })
                // embedding content
                const { model, embedding } = await this.embedding(pages, provider)
                resource.embeddings1 = await ctx.model.Embedding1.bulkCreate(
                    embedding.map((embedding, i) => ({
                        resourceId,
                        page: i + 1,
                        embedding,
                        model,
                        content: pages[i],
                        tokens: $.countTokens(pages[i])
                    })),
                    { transaction }
                )
                await resource.save({ transaction })
            }
            return { resource, provider }
        } else if (provider === EmbedModelProvider.Other) {
            resource.embeddings2 = await ctx.model.Embedding2.findAll({ where: { resourceId }, transaction })

            if (!resource.embeddings2.length || reset) {
                // extract page of content from the file
                const path = await ctx.service.util.getFile(resource.filePath)
                const pages = await ctx.service.util.extractPages(path)
                resource.page = pages.length
                resource.tokens = $.countTokens(resource.content)
                if (reset) await ctx.model.Embedding2.destroy({ where: { resourceId }, transaction })
                // embedding content
                const { model, embedding } = await this.embedding(pages, provider)
                resource.embeddings2 = await ctx.model.Embedding2.bulkCreate(
                    embedding.map((embedding, i) => ({
                        resourceId,
                        page: i + 1,
                        embedding,
                        model,
                        content: pages[i],
                        tokens: $.countTokens(pages[i])
                    })),
                    { transaction }
                )
                await resource.save({ transaction })
            }
            return { resource, provider }
        } else throw new Error('Embedding provider and model not found')
    }

    async imagine(
        prompt: string,
        negativePrompt?: string,
        num?: number,
        width?: number,
        height?: number,
        provider: ImagineModelProvider = ImagineModelProvider.OpenAI,
        model?: ImagineModel
    ) {
        return await ai.imagine(prompt, { negativePrompt, provider, model, width, height, num })
    }

    async task(id?: string, provider: ImagineModelProvider = ImagineModelProvider.OpenAI) {
        return await ai.task(provider, id)
    }

    async change(
        id: string,
        action: string,
        index?: number,
        provider: ImagineModelProvider = ImagineModelProvider.MidJourney
    ) {
        if (provider === ImagineModelProvider.MidJourney)
            return await ai.change(provider, id, action as MJTaskType, index)
        else throw new Error('Image change model not found')
    }

    // check content by AI, iFlyTek, WeChat or mint-filter
    // content is text or image, image should be base64 string
    async audit(content: string, provider: AuditProvider = AuditProvider.MINT) {
        content = content.replace(/\r\n|\n/g, ' ').trim()
        if (!content) throw new Error('Audit content is empty')

        const { ctx } = this
        const res: AuditResponse = { flag: true, data: null }

        if (provider === AuditProvider.WX) {
            const result = await ctx.service.weChat.contentCheck(content, ctx.user?.wxOpenId || '')
            res.flag = result.result ? result.result.suggest === 'pass' : result.errcode === 0
            res.data = result
        } else if (provider === AuditProvider.FLY) {
            const result = await fly.audit(content)
            res.flag = result.code === '000000' && result.data.result.suggest === 'pass'
            res.data = result
        } else if (provider === AuditProvider.AI) {
            const prompt = await this.getConfig('AUDIT_PROMPT')
            const message: ChatMessage[] = [{ role: ChatRoleEnum.SYSTEM, content: prompt + content }]

            try {
                const result = await ai.chat(message, {
                    provider: ChatModelProvider.GLM,
                    model: GLMChatModel.GLM_6B,
                    stream: false,
                    temperature: 0
                })
                const json = $.json<AIAuditResponse>((result as ChatResponse).content)
                res.flag = json?.safe || false
                res.data = result
            } catch (e) {
                res.flag = false
                res.data = e as Error
            }
        } else {
            const result = ctx.service.util.mintFilter(content)
            res.flag = result.verify
            res.data = result
        }

        // log audit
        await ctx.model.AuditLog.create({ provider, content, userId: ctx.user?.id, ...res })

        return res
    }
}
