/** @format */

import * as fs from 'fs'
import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import {
    ChatCompletionRequestMessage,
    ChatCompletionRequestMessageRoleEnum,
    ChatCompletionResponseMessageRoleEnum,
    CreateChatCompletionResponse
} from 'openai'
import { Service } from 'egg'
import { EggFile } from 'egg-multipart'
import { IncludeOptions, Op } from 'sequelize'
import { random } from 'lodash'
import { Resource } from '@model/Resource'
import { createParser, EventSourceParser } from 'eventsource-parser'
import { IncomingMessage } from 'http'
import isJSON from '@stdlib/assert-is-json'
import gpt from '@util/openai' // OpenAI models
import glm from '@util/glm' // GLM models
import vec from '@util/text2vec'
import $ from '@util/util'

const WEEK = 7 * 24 * 60 * 60 * 1000
const MAX_TOKEN = 3000
const PAGE_LIMIT = 5
const SAME_SIMILARITY = 0.01
// const FIND_SIMILARITY = 0.23
const CHAT_BACKTRACK = 3
const CHAT_STREAM_EXPIRE = 1 * 60 * 1000

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Chat extends Service {
    // list all dialogs
    async listDialog(userId: number) {
        const { ctx } = this

        return await ctx.model.Dialog.findAll({
            where: {
                userId,
                resourceId: { [Op.ne]: 0 },
                isEffect: true,
                isDel: false
            },
            attributes: ['id'],
            order: [['id', 'DESC']],
            include: {
                model: ctx.model.Resource,
                include: [{ model: ctx.model.ResourceType }]
            }
        })
    }

    // user upload file
    async upload(file: EggFile, userId: number, typeId: number): Promise<Resource> {
        // detect file type from buffer
        const buff = fs.readFileSync(file.filepath)
        const { text, ext } = await $.extractText(buff)
        if (!ext) throw new Error('Error to detect file type')
        if (text) {
            const resource: ResourceFile = {
                text,
                name: file.filename,
                path: file.filepath,
                ext,
                size: buff.byteLength
            }
            return await this.saveDocument(resource, userId, typeId)
        } else throw new Error('File not support')
        /*else if (type.ext === 'png' || type.ext === 'jpg' || type.ext === 'gif' || type.ext === 'webp') { }*/
    }

    async saveDocument(file: ResourceFile, userId: number, typeId: number) {
        const { ctx } = this

        // check same similarity for first one page, 1000 tokens
        const p: string[] = await $.splitPage(file.text, 800)
        if (!p.length) throw new Error('File content cannot be split')
        const embed = await vec.embedding([p[0]])
        await vec.log(ctx, userId, embed, '[WeChat/upload]: check similarity for first page')
        const embedding = embed.data[0]
        const result = await ctx.model.Resource.similarFindAll2(embedding, 1, SAME_SIMILARITY)
        if (result.length) return result[0]

        // embedding all pages, sentence-level, 500 token per page
        const s: string[] = await $.splitPage(file.text, 400)
        s[0] = ctx.__('Main content of this document, including the title, summary, abstract, and authors') + s[0]
        if (!s.length) throw new Error('File content cannot be split')
        const res = await vec.embedding(s)
        await vec.log(ctx, userId, res, '[WeChat/upload]: embedding all pages')

        // save resource to cos
        const upload = await $.cosUpload(`${new Date().getTime()}${random(1000, 9999)}.${file.ext}`, file.path)
        // save resource + pages
        const pages: any[] = res.data.map((v, i) => {
            return {
                page: i + 1,
                embedding2: v,
                content: s[i],
                length: $.countTokens(s[i])
            }
        })
        return await ctx.model.Resource.create(
            {
                page: s.length, // sentence num
                typeId,
                userId,
                embedding2: embedding,
                filePath: `https://${upload.Location}`,
                fileName: file.name,
                fileSize: file.size,
                pages
            },
            { include: ctx.model.Page }
        )
    }

    // async saveImage(userId: number, typeId: number, path: string, file: EggFile, buff: Buffer) {}

    // find or create a dialog
    async dialog(userId: number, resourceId?: number, include?: IncludeOptions) {
        const { ctx } = this

        // create or find the dialog
        const [res, created] = await ctx.model.Dialog.findOrCreate({
            where: { userId, resourceId: resourceId || null },
            include
        })

        // first create
        if (created) {
            // free chat initial content
            let content = `${ctx.__('Hello, I am AI Reading Guy')}\n${ctx.__('Feel free to chat with me')}`
            // resource chat initial content
            if (resourceId) {
                const resource = await ctx.model.Resource.findOne({
                    where: { id: resourceId, isEffect: true, isDel: false }
                })
                content = `${ctx.__('Hello, I am AI Reading Guy')}
                       ${ctx.__('I have finished reading the file')} ${resource?.fileName}
                       ${ctx.__('You can ask me questions about this book')}`
            }
            res.chats = [
                await ctx.model.Chat.create({
                    dialogId: res.id,
                    role: ChatCompletionRequestMessageRoleEnum.Assistant,
                    content
                })
            ]
        }
        return res
    }

    // list all the chats from a user and dialog
    async listChat(userId: number, dialogId?, limit: number = 15) {
        const { ctx } = this
        const include: IncludeOptions = { model: ctx.model.Chat, limit, order: [['createdAt', 'DESC']] }
        const dialog = dialogId
            ? await ctx.model.Dialog.findByPk(dialogId, { include })
            : await this.dialog(userId, undefined, include)
        dialog?.chats.reverse()
        return dialog
    }

    // chat
    async chat(
        input: string,
        userId: number,
        dialogId: number = 0,
        stream: boolean = false,
        model: AIModelEnum = 'GLM'
    ) {
        const { ctx } = this

        // check processing chat stream
        if (stream) {
            const check = await this.getChatStream(userId)
            if (check && !check.end && new Date().getTime() - check.time < CHAT_STREAM_EXPIRE)
                throw new Error('Another chat is processing')
        }

        // acquire dialog
        const include: IncludeOptions = {
            model: ctx.model.Chat,
            limit: CHAT_BACKTRACK,
            order: [['id', 'desc']]
        }
        console.log('================', dialogId)
        const where = dialogId ? { id: dialogId, userId } : { resourceId: null, userId }
        const dialog = await ctx.model.Dialog.findOne({ where, include })
        if (!dialog) throw new Error('Dialog is invalid')
        dialog.chats?.reverse()
        dialog.chats?.shift()

        const prompts: ChatCompletionRequestMessage[] = []
        // add user chat history
        for (const item of dialog.chats)
            prompts.push({ role: item.role as ChatCompletionRequestMessageRoleEnum, content: item.content })

        prompts.push({
            role: ChatCompletionRequestMessageRoleEnum.System,
            content: ctx.__('Your English name is Reading Guy')
        })

        const resourceId = dialog.resourceId
        let prompt = input
        // find similar pages of the resource id
        if (resourceId) {
            const embed = await vec.embedding([input])
            const embedding = embed.data[0]
            const role = ChatCompletionRequestMessageRoleEnum.System
            prompts.push({ role, content: ctx.__('The content of document is as follows') })
            // find related pages
            const pages = await ctx.model.Page.similarFindAll2(embedding, PAGE_LIMIT, { resourceId })
            while (pages.reduce((n, p) => n + $.countTokens(p.content), 0) > MAX_TOKEN) pages.pop()
            pages.sort((a, b) => a.id - b.id)
            for (const item of pages) prompts.push({ role, content: item.content })
            prompt = `${ctx.__('Answer according to the document')}${input}`
        }
        prompts.push({
            role: ChatCompletionRequestMessageRoleEnum.User,
            content: prompt
        })

        // save user prompt
        await this.saveChat(dialog.id, ChatCompletionRequestMessageRoleEnum.User, input)

        // stream mode
        if (stream) {
            // reset chat stream cache
            const cache: ChatStreamCache = {
                dialogId: dialog.id,
                content: '',
                end: false,
                time: new Date().getTime()
            }
            const GPTDataParse = createParser(e => {
                if (e.type === 'event')
                    if (isJSON(e.data)) {
                        const data = JSON.parse(e.data) as CreateChatCompletionStreamResponse
                        cache.content += data.choices[0].delta.content || ''
                        if (cache.content) $.setCache(userId, cache)
                    }
            })
            const GLMDataParse = createParser(e => {
                if (e.type === 'event') {
                    if (isJSON(e.data)) {
                        const data = JSON.parse(e.data) as GLMChatResponse
                        cache.content = data.content
                        if (cache.content) $.setCache(userId, cache)
                    }
                }
            })

            let res: IncomingMessage
            let parser: EventSourceParser
            switch (model) {
                case 'GPT':
                    res = await gpt.chat<IncomingMessage>(prompts, true)
                    parser = GPTDataParse
                    break
                case 'GLM':
                    parser = GLMDataParse
                    res = await glm.chat<IncomingMessage>(prompts, true, 4096, 0.5)
                    break
                default:
                    parser = GLMDataParse
                    res = await glm.chat<IncomingMessage>(prompts, true, 4096, 0.5)
            }

            await $.setCache(userId, cache)
            res.on('data', (buff: Buffer) => parser.feed(buff.toString('utf8')))
            res.on('error', e => this.streamEnd(userId, cache, e))
            res.on('end', () => this.streamEnd(userId, cache))
        }
        // sync mode
        else {
            // request GPT
            if (model === 'GPT') {
                const res = await gpt.chat<CreateChatCompletionResponse>(prompts)
                const content = res.choices[0].message?.content
                if (!content) throw new Error('Fail to get GPT sync response')
                await gpt.log(ctx, userId, res, `[Chat/chat]: ${input}\n${content}`)
                return await this.saveChat(dialog.id, ChatCompletionResponseMessageRoleEnum.Assistant, content)
            }

            // request GLM
            if (model === 'GLM') {
                const res = await glm.chat<GLMChatResponse>(prompts, false, 4096, 0.5, 1)
                const content = res.content
                if (!content) throw new Error('Fail to get GLM sync response')
                await glm.log(ctx, userId, res, `[Chat/chat]: ${input}\n${content}`)
                return await this.saveChat(dialog.id, ChatCompletionResponseMessageRoleEnum.Assistant, content)
            }
        }
    }
    async streamEnd(userId: number, cache: ChatStreamCache, error?: Error) {
        cache.end = true
        cache.error = error
        if (cache.content) {
            const chat = await this.saveChat(
                cache.dialogId,
                ChatCompletionResponseMessageRoleEnum.Assistant,
                cache.content
            )
            cache.chatId = chat.id
        }
        $.setCache(userId, cache)
    }

    // save chat
    async saveChat(
        dialogId: number,
        role: ChatCompletionRequestMessageRoleEnum | ChatCompletionResponseMessageRoleEnum,
        content: string
    ) {
        return await this.ctx.model.Chat.create({ dialogId, role, content })
    }

    // get current chat stream by userId
    async getChatStream(userId: number) {
        return await $.getCache<ChatStreamCache>(userId)
    }

    // reduce user upload chance
    async reduceUploadChance(userId: number) {
        const { ctx } = this
        const user = await ctx.model.User.findByPk(userId, { include: { model: ctx.model.UserChance } })
        if (!user || !user.chance) throw new Error('Fail to find user')

        if (user.chance.uploadChanceFree > 0) await user.chance.decrement({ uploadChanceFree: 1 })
        else if (user.chance.uploadChance > 0) await user.chance.decrement({ uploadChance: 1 })
        else throw new Error('Chance of upload not enough, waiting for one week')
    }

    // reduce user chat chance
    async reduceChatChance(userId: number) {
        const { ctx } = this
        const user = await ctx.model.User.findByPk(userId, { include: { model: ctx.model.UserChance } })
        if (!user || !user.chance) throw new Error('Fail to find user')

        if (user.chance.chatChanceFree > 0) await user.chance.decrement({ chatChanceFree: 1 })
        else if (user.chance.chatChance > 0) await user.chance.decrement({ chatChance: 1 })
        else throw new Error('Chance of chat not enough, waiting for one week')
    }
    // get user and reset free chat/upload chance
    async getUserResetChance(userId: number) {
        const { ctx } = this
        const user = await ctx.service.user.getUser(userId)
        if (!user || !user.chance) throw new Error('Fail to find user')

        const config = await ctx.service.user.getConfig()
        const now = new Date()
        if (now.getTime() - user.chance.uploadChanceFreeUpdateAt.getTime() >= WEEK) {
            user.chance.uploadChanceFree = parseInt(config.DEFAULT_FREE_UPLOAD_CHANCE || '0')
            user.chance.uploadChanceFreeUpdateAt = now
            await user.chance.save()
        }
        if (now.getTime() - user.chance.chatChanceFreeUpdateAt.getTime() >= WEEK) {
            user.chance.chatChanceFree = parseInt(config.DEFAULT_FREE_CHAT_CHANCE || '0')
            user.chance.chatChanceFreeUpdateAt = now
            await user.chance.save()
        }
        return { user, config }
    }
}
