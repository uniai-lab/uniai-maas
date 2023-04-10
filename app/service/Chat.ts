/** @format */

import * as fs from 'fs'
import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import {
    ChatCompletionRequestMessage,
    ChatCompletionRequestMessageRoleEnum,
    ChatCompletionResponseMessageRoleEnum
} from 'openai'
import { Service } from 'egg'
import { EggFile } from 'egg-multipart'
import { IncludeOptions, Op } from 'sequelize'
import { random } from 'lodash'
import { Resource } from '@model/Resource'
import { Dialog } from '@model/Dialog'
import { IncomingMessage } from 'http'
import isJSON from '@stdlib/assert-is-json'
import openai from '@util/openai'
import $ from '@util/util'

const WEEK = 7 * 24 * 60 * 60 * 1000
const MAX_TOKEN = 3000
const PAGE_LIMIT = 5
const SAME_SIMILARITY = 0.01
// const FIND_SIMILARITY = 0.23
const CHAT_BACKTRACK = 3
const CHAT_STREAM_EXPIRE = 5 * 60 * 1000

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Chat extends Service {
    // list all dialogs
    async listDialog(userId: number) {
        const { ctx } = this

        return await ctx.model.Dialog.findAll({
            where: {
                userId,
                resourceId: { [Op.ne]: null },
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
        const embed = await openai.embedding([p[0]])
        await openai.log(ctx, userId, embed, '[Chat/upload]: check similarity for first page')
        const embedding = embed.data[0].embedding
        const result = await ctx.model.Resource.similarFindAll(embedding, 1, SAME_SIMILARITY)
        if (result.length) return result[0]

        // embedding all pages, sentence-level, 500 token per page
        const s: string[] = await $.splitPage(file.text, 400)
        s[0] = ctx.__('Main content of this document, including the title, summary, abstract, and authors') + s[0]
        if (!s.length) throw new Error('File content cannot be split')
        const res = await openai.embedding(s)
        await openai.log(ctx, userId, res, '[Chat/upload]: embedding all pages (sentences)')

        // save resource to cos
        const upload = await $.cosUpload(`${new Date().getTime()}${random(1000, 9999)}.${file.ext}`, file.path)
        // save resource + pages
        const pages: any[] = res.data.map((v, i) => {
            return {
                page: i + 1,
                embedding: v.embedding,
                content: s[i],
                length: $.countTokens(s[i])
            }
        })
        return await ctx.model.Resource.create(
            {
                page: s.length, // sentence num
                typeId,
                userId,
                embedding,
                filePath: `https://${upload.Location}`,
                fileName: file.name,
                fileSize: file.size,
                author: ctx.__('Unknown'),
                promptTokens: res.usage.prompt_tokens,
                totalTokens: res.usage.total_tokens,
                pages
            },
            { include: ctx.model.Page }
        )
    }

    // async saveImage(userId: number, typeId: number, path: string, file: EggFile, buff: Buffer) {}

    // find or create the dialog
    async dialog(userId: number, resourceId: number | null = null) {
        const { ctx } = this

        // free chat initial content
        let content = `${ctx.__('Hello, I am AI Reading Guy')}
                       ${ctx.__('Feel free to chat with me')}`
        // resource chat initial content
        if (resourceId) {
            const resource = await ctx.model.Resource.findOne({
                where: { id: resourceId, isEffect: true, isDel: false }
            })
            if (!resource) throw new Error('Resource not found')
            content = `${ctx.__('Hello, I am AI Reading Guy')}
                       ${ctx.__('I have finished reading the file')} ${resource.fileName}
                       ${ctx.__('You can ask me questions about this book')}`
        }

        // create or find the dialog
        return await ctx.model.Dialog.findOrCreate({
            where: { userId, resourceId },
            defaults: {
                chats: [{ role: ChatCompletionRequestMessageRoleEnum.Assistant, content }]
            },
            include: { model: ctx.model.Chat }
        })
    }

    // list all the chats from a user and dialog
    async listChat(userId: number, dialogId?: number) {
        const { ctx } = this
        if (dialogId) return await ctx.model.Dialog.findByPk(dialogId, { include: { model: ctx.model.Chat } })
        // free chat
        return (await this.dialog(userId))[0]
    }

    // chat
    async chat(input: string, userId: number, dialogId?: number, stream: boolean = false) {
        const { ctx } = this

        // acquire dialog
        let dialog: Dialog | null
        const include: IncludeOptions = {
            model: ctx.model.Chat,
            limit: CHAT_BACKTRACK,
            order: [['id', 'desc']]
        }
        if (dialogId) dialog = await ctx.model.Dialog.findOne({ where: { id: dialogId, userId }, include })
        else dialog = await ctx.model.Dialog.findOne({ where: { resourceId: null, userId }, include })
        if (!dialog) throw new Error('Dialog is invalid')
        if (!dialog.chats) dialog.chats = []
        dialog.chats.reverse()
        dialog.chats.shift()

        const prompts: ChatCompletionRequestMessage[] = []
        let inputAll: string = ''
        for (const item of dialog.chats) {
            // add user former prompts
            prompts.push({ role: item.role as ChatCompletionRequestMessageRoleEnum, content: item.content })
            if (item.role === ChatCompletionRequestMessageRoleEnum.User) inputAll += `${item.content}\n`
        }

        /*
        let must = true
        // try to find the most similar resource in db
        if (!dialog.resourceId) {
            const resources = await ctx.model.Resource.similarFindAll(embedding, 1, FIND_SIMILARITY)
            if (resources.length) dialog.resourceId = resources[0].id
            must = false
        }
        */
        // directly to find similar pages of the resource id
        if (dialog.resourceId) {
            const embed = await openai.embedding([input + inputAll])
            const embedding = embed.data[0].embedding
            const role = ChatCompletionRequestMessageRoleEnum.System
            const pages = await ctx.model.Page.similarFindAll(embedding, PAGE_LIMIT, dialog.resourceId)
            while (pages.reduce((n, p) => n + $.countTokens(p.content), 0) > MAX_TOKEN) pages.pop()
            pages.sort((a, b) => a.id - b.id)
            for (const item of pages) prompts.push({ role, content: item.content })

            // add start prompts
            prompts.unshift({ role, content: ctx.__('The content of document is as follows') })
            // add end prompts
            prompts.push({ role, content: ctx.__('Answer according to the document') })
        }

        prompts.unshift({
            role: ChatCompletionRequestMessageRoleEnum.System,
            content: ctx.__('Your English name is Reading Guy')
        })
        prompts.push({
            role: ChatCompletionRequestMessageRoleEnum.User,
            content: input
        })

        // save user input
        await this.saveChat(dialog.id, ChatCompletionRequestMessageRoleEnum.User, input)

        // stream mode
        if (stream) {
            const cache = await this.getChatStream(userId)
            if (cache && !cache.end && new Date().getTime() - cache.time < CHAT_STREAM_EXPIRE)
                throw new Error('Another chat stream is processing')
            // request to GPT
            const res = await openai.chat(prompts, stream)
            this.startChatStream((res as unknown) as IncomingMessage, userId, dialog.id)
        } else {
            // request to GPT
            const res = await openai.chat(prompts, stream)
            // sync mode
            const content = res.choices[0].message?.content
            if (!content) throw new Error('Fail to get sync response')
            await openai.log(ctx, userId, res, `[Chat/chat]: ${input}\n${content}`)
            return await this.saveChat(dialog.id, ChatCompletionResponseMessageRoleEnum.Assistant, content)
        }
    }

    // save chat
    async saveChat(
        dialogId: number,
        role: ChatCompletionRequestMessageRoleEnum | ChatCompletionResponseMessageRoleEnum,
        content: string
    ) {
        return await this.ctx.model.Chat.create({ dialogId, role, content })
    }

    // chat stream with cache
    startChatStream(stream: IncomingMessage, userId: number, dialogId: number) {
        // reset chat stream cache
        const cache: ChatStreamCache = { dialogId, content: '', end: false, time: new Date().getTime() }
        $.setCache(userId, cache)

        // start chat stream
        let tmp = ''
        stream.on('data', (data: Buffer) => {
            const message = data
                .toString('utf8')
                .split('\n')
                .filter(m => m.length > 0)
            for (const item of message) {
                tmp += item.replace(/^data: /, '')
                if (isJSON(tmp)) {
                    const data = JSON.parse(tmp) as CreateChatCompletionStreamResponse
                    tmp = ''
                    cache.content += data.choices[0].delta.content || ''
                    if (cache.content) $.setCache(userId, cache)
                }
            }
        })

        stream.on('end', async () => {
            cache.end = true
            if (cache.content) {
                const chat = await this.saveChat(
                    dialogId,
                    ChatCompletionResponseMessageRoleEnum.Assistant,
                    cache.content
                )
                cache.chatId = chat.id
            }
            $.setCache(userId, cache)
        })

        stream.on('error', e => {
            cache.end = true
            cache.error = e
            $.setCache(userId, cache)
        })
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

        // update free upload chance
        const config = await ctx.service.user.getConfig()
        if (new Date().getTime() - user.chance.uploadChanceFreeUpdateAt.getTime() >= WEEK) {
            user.chance.uploadChanceFree = parseInt(config.DEFAULT_FREE_UPLOAD_CHANCE || '0')
            user.chance.uploadChanceFreeUpdateAt = new Date()
        }

        if (user.chance.uploadChanceFree > 0) user.chance.uploadChanceFree--
        else if (user.chance.uploadChance > 0) user.chance.uploadChance--
        else throw new Error('Chance of upload not enough, waiting for one week')

        await user.chance.save()
    }

    // reduce user chat chance
    async reduceChatChance(userId: number) {
        const { ctx } = this
        const user = await ctx.model.User.findByPk(userId, { include: { model: ctx.model.UserChance } })
        if (!user || !user.chance) throw new Error('Fail to find user')

        const config = await ctx.service.user.getConfig()
        // update free chat chance
        if (new Date().getTime() - user.chance.chatChanceFreeUpdateAt.getTime() >= WEEK) {
            user.chance.chatChanceFree = parseInt(config.DEFAULT_FREE_CHAT_CHANCE || '0')
            user.chance.chatChanceFreeUpdateAt = new Date()
        }

        if (user.chance.chatChanceFree > 0) user.chance.chatChanceFree--
        else if (user.chance.chatChance > 0) user.chance.chatChance--
        else throw new Error('Chance of chat not enough, waiting for one week')

        await user.chance.save()
    }
}
