/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import {
    ChatCompletionRequestMessage,
    ChatCompletionRequestMessageRoleEnum,
    ChatCompletionResponseMessageRoleEnum
} from 'openai'
import { EggFile } from 'egg-multipart'
import { statSync } from 'fs'
import { IncludeOptions, Op } from 'sequelize'
import { random } from 'lodash'
import { Resource } from '@model/Resource'
import { GPTChatStreamResponse } from '@util/openai' // OpenAI models
import glm, { GLMChatResponse } from '@util/glm' // GLM models
import md5 from 'md5'
import $ from '@util/util'
import { Stream } from 'stream'
import { createParser } from 'eventsource-parser'
import { SPKChatResponse } from '@util/fly'

const WEEK = 7 * 24 * 60 * 60 * 1000
const MAX_TOKEN = 2500
const PAGE_LIMIT = 5
const TOKEN_FIRST_PAGE = 800
const TOKEN_SPLIT_PAGE = 400
const SAME_SIMILARITY = 0.01
const CHAT_BACKTRACK = 10
const CHAT_STREAM_EXPIRE = 3 * 60 * 1000

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class WeChat extends Service {
    // use wechat to login, get code, return new user
    async signIn(code: string, fid?: number) {
        const { ctx } = this

        const authURL = process.env.WX_APP_AUTH_URL // wx api, get login auth
        const appId = process.env.WX_APP_ID // wx AppID
        const appSecret = process.env.WX_APP_SECRET // wx AppSecret

        // get access_token, openid, unionid
        const url = `${authURL}?grant_type=authorization_code&appid=${appId}&secret=${appSecret}&js_code=${code}`
        const res = await $.get<undefined, WXAuthCodeAPI>(url)
        if (!res.openid || !res.session_key) throw new Error('Fail to get openid or session key')

        const config = await ctx.service.user.getConfig()
        // try to create user
        const [user, created] = await ctx.model.User.findOrCreate({
            where: {
                wxOpenId: res.openid
            },
            defaults: {
                chance: {
                    level: 0,
                    uploadSize: 5e6,
                    chatChance: 0,
                    chatChanceUpdateAt: new Date(),
                    chatChanceFree: parseInt(config.DEFAULT_FREE_CHAT_CHANCE || '0'),
                    chatChanceFreeUpdateAt: new Date(),
                    uploadChance: 0,
                    uploadChanceUpdateAt: new Date(),
                    uploadChanceFree: parseInt(config.DEFAULT_FREE_UPLOAD_CHANCE || '0'),
                    uploadChanceFreeUpdateAt: new Date()
                }
            },
            include: ctx.model.UserChance
        })

        // first create, set default user info
        if (created) {
            user.avatar = config.DEFAULT_AVATAR_USER || ''
            user.name = `${ctx.__(config.DEFAULT_USERNAME || 'Reader')} NO.${user.id}`
            // add default dialog resource
            if (config.INIT_RESOURCE_ID) await this.dialog(user.id, parseInt(config.INIT_RESOURCE_ID))
            await this.dialog(user.id) // add free chat dialog
            if (fid) await this.shareReward(fid)
        }

        // user is existed, update session key
        user.token = md5(`${res.openid}${new Date().getTime()}${code}`)
        user.tokenTime = new Date()
        user.wxSessionKey = res.session_key
        await $.setCache<UserTokenCache>(`token_${user.id}`, {
            id: user.id,
            token: user.token,
            time: user.tokenTime.getTime()
        })
        return await user.save()
    }

    // user sign phone number
    async signUp(code: string, openid: string, iv: string, encryptedData: string, fid?: number) {
        const { ctx } = this

        const user = await ctx.model.User.findOne({ where: { wxOpenId: openid }, include: ctx.model.UserChance })
        if (!user || !user.wxSessionKey) throw new Error('Fail to find user')

        if (user.phone && user.countryCode) {
            // directly sign in
            user.token = md5(`${user.wxOpenId}${new Date().getTime()}${code}`)
            user.tokenTime = new Date()
        } else {
            // sign up
            const appId = process.env.WX_APP_ID
            // decode user info
            const res = $.decryptData(encryptedData, iv, user.wxSessionKey, appId)
            if (res && res.phoneNumber && res.countryCode) {
                user.phone = res.phoneNumber
                user.countryCode = res.countryCode
                user.token = md5(`${user.wxOpenId}${new Date().getTime()}${code}`)
                user.tokenTime = new Date()
                if (fid) await this.shareReward(fid)
            } else throw new Error('Error to decode wechat userinfo')
        }

        await $.setCache<UserTokenCache>(`token_${user.id}`, {
            id: user.id,
            token: user.token,
            time: user.tokenTime.getTime()
        })
        await user.save()
        return user
    }

    // user share and another one sign up, add reward
    async shareReward(userId: number) {
        const { ctx } = this
        const uc = await ctx.model.UserChance.findOne({ where: { userId } })
        if (!uc) throw Error('Fail to reward')

        const config = await ctx.service.user.getConfig()
        uc.uploadChance += parseInt(config.SHARE_REWARD_UPLOAD_CHANCE || '0')
        uc.chatChance += parseInt(config.SHARE_REWARD_CHAT_CHANCE || '0')
        uc.uploadChanceUpdateAt = new Date()
        uc.chatChanceUpdateAt = new Date()
        return await uc.save()
    }

    // user follow wechat public account, add reward
    async followReward(unionId: string, openId: string) {
        const { ctx } = this
        const user = await ctx.model.User.findOne({
            where: { wxUnionId: unionId, wxPublicOpenId: null },
            include: ctx.model.UserChance
        })
        if (!user || !user.chance) throw Error('Fail to reward')

        const config = await ctx.service.user.getConfig()
        user.chance.chatChance += parseInt(config.FOLLOW_REWARD_CHAT_CHANCE || '0')
        user.chance.chatChanceUpdateAt = new Date()
        user.wxPublicOpenId = openId // public open id
        await user.chance.save()
        return await user.save()
    }

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
                attributes: ['id', 'page', 'tokens', 'fileName', 'fileSize', 'filePath', 'updatedAt', 'typeId'],
                include: [{ model: ctx.model.ResourceType, attributes: ['type', 'description'] }]
            }
        })
    }

    // user upload file
    async upload(file: EggFile, userId: number, typeId: number): Promise<Resource> {
        // detect file type from buffer
        const { text, ext } = await $.extractText(file.filepath)
        if (!ext) throw new Error('Fail to detect file type')
        if (!text) throw new Error('Fail to extract content text')

        const resource: ResourceFile = {
            text,
            name: file.filename,
            path: file.filepath,
            ext,
            size: statSync(file.filepath).size
        }
        return await this.saveDocument(resource, userId, typeId)
    }

    async saveDocument(file: ResourceFile, userId: number, typeId: number) {
        const { ctx } = this

        // check same similarity for first one page, 1000 tokens
        const firstPage: string[] = $.splitPage(file.text, TOKEN_FIRST_PAGE)
        const splitPage: string[] = $.splitPage(file.text, TOKEN_SPLIT_PAGE)
        if (!firstPage.length || !splitPage.length) throw new Error('File content cannot be split')

        const embed = await glm.embedding([firstPage[0]])
        const embedding2 = embed.data[0]
        const check = await ctx.model.Resource.similarFindAll2(embedding2, 1, SAME_SIMILARITY)
        if (check.length) return check[0]

        // embedding all pages, sentence-level, 500 token per page
        splitPage[0] = ctx.__('title, copyright, abstract, authors') + splitPage[0]
        const res = await glm.embedding(splitPage)

        // save resource to cos
        const upload = await $.cosUpload(`${new Date().getTime()}${random(1000, 9999)}.${file.ext}`, file.path)
        // save resource + pages
        return await ctx.model.Resource.create(
            {
                page: splitPage.length, // sentence num
                typeId,
                userId,
                embedding2,
                filePath: `https://${upload.Location}`,
                fileName: file.name,
                fileSize: file.size,
                content: file.text,
                tokens: $.countTokens(file.text),
                pages: res.data.map((v, i) => {
                    return {
                        page: i + 1,
                        embedding2: v,
                        content: splitPage[i],
                        tokens: $.countTokens(splitPage[i])
                    }
                })
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
            res.chats = await ctx.model.Chat.bulkCreate([
                {
                    dialogId: res.id,
                    role: ChatCompletionRequestMessageRoleEnum.Assistant,
                    content
                }
            ])
        }
        return res
    }

    // list all the chats from a user and dialog
    async listChat(userId: number, dialogId: number = 0, limit: number = CHAT_BACKTRACK) {
        const { ctx } = this
        const include: IncludeOptions = { model: ctx.model.Chat, limit, order: [['createdAt', 'DESC']] }
        const dialog = dialogId
            ? await ctx.model.Dialog.findOne({ where: { id: dialogId, userId }, include })
            : await this.dialog(userId, undefined, include)
        dialog?.chats.reverse()
        return dialog
    }

    // chat
    async chat(input: string, userId: number, dialogId: number = 0, model: AIModelEnum = 'GLM') {
        const { ctx } = this

        // check processing chat stream
        const check = await this.getChat(userId)
        if (check && !check.chatId) throw new Error('You have another processing chat')

        // check user chat chance
        const user = await ctx.model.UserChance.findOne({ where: { userId } })
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree <= 0 && user.chatChance <= 0)
            throw new Error('Chance of chat not enough, waiting for one week')

        // dialogId ? dialog chat : free chat
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId ? { id: dialogId, userId } : { resourceId: null, userId },
            include: {
                model: ctx.model.Chat,
                limit: CHAT_BACKTRACK,
                order: [['id', 'desc']]
            }
        })
        if (!dialog) throw new Error('Dialog is invalid')
        dialog.chats.reverse()

        const prompts: ChatCompletionRequestMessage[] = []
        // define character

        prompts.push({ role: ChatCompletionRequestMessageRoleEnum.System, content: ctx.__('you are') })

        // add user chat history
        for (const { role, content } of dialog.chats)
            prompts.push({ role: role as ChatCompletionRequestMessageRoleEnum, content })

        const resourceId = dialog.resourceId
        let prompt = input
        // find similar pages of the resource id
        if (resourceId) {
            const embed = await glm.embedding([input])
            const embedding = embed.data[0]
            const role = ChatCompletionRequestMessageRoleEnum.System
            prompts.push({ role, content: ctx.__('document content') })
            // find related pages
            const pages = await ctx.model.Page.similarFindAll2(embedding, PAGE_LIMIT, { resourceId })
            while (pages.reduce((n, p) => n + $.countTokens(p.content), 0) > MAX_TOKEN) pages.pop()
            pages.sort((a, b) => a.id - b.id)
            for (const { content } of pages) prompts.push({ role, content })
            prompt = `${ctx.__('answer according to')}${input}`
        }

        prompts.push({ role: ChatCompletionRequestMessageRoleEnum.User, content: prompt })

        // set chat stream cache
        const cache: ChatStreamCache = {
            chatId: 0,
            dialogId: dialog.id,
            content: '',
            time: new Date().getTime()
        }
        await $.setCache(`chat_${userId}`, cache)

        // start chat stream
        const stream = (await ctx.service.uniAI.chat(prompts, true, model)) as Stream
        const parser = createParser(event => {
            if (event.type === 'event') {
                if (model === 'GPT') {
                    const obj = $.json<GPTChatStreamResponse>(event.data)
                    if (obj?.choices[0].delta?.content) cache.content += obj.choices[0].delta.content
                }
                if (model === 'GLM') {
                    const obj = $.json<GLMChatResponse>(event.data)
                    if (obj?.content) cache.content += obj.content
                }
                if (model === 'SPARK') {
                    const obj = $.json<SPKChatResponse>(event.data)
                    if (obj?.payload.choices.text[0].content) cache.content += obj.payload.choices.text[0].content
                }
                $.setCache(`chat_${userId}`, cache)
            }
        })

        // add listen stream
        stream.on('data', (buff: Buffer) => parser.feed(buff.toString('utf8')))
        stream.on('error', (e: Error) => {
            cache.content = e.message
            cache.chatId = 0.1
            $.setCache(`chat_${userId}`, cache)
        })
        stream.on('end', async () => {
            if (user.chatChanceFree > 0) await user.decrement({ chatChanceFree: 1 })
            else await user.decrement({ chatChance: 1 })

            // save assistant response
            if (cache.content) {
                const chat = await ctx.model.Chat.create({
                    dialogId: cache.dialogId,
                    role: ChatCompletionResponseMessageRoleEnum.Assistant,
                    content: cache.content
                })
                cache.chatId = chat.id
            } else cache.chatId = 0.1
            $.setCache(`chat_${userId}`, cache)
        })

        // save user prompt
        return await this.ctx.model.Chat.create({
            dialogId: dialog.id,
            role: ChatCompletionRequestMessageRoleEnum.User,
            content: input
        })
    }

    // get current chat stream by userId
    async getChat(userId: number) {
        const res = await $.getCache<ChatStreamCache>(`chat_${userId}`)
        // expire, remove chat cache
        if (res && new Date().getTime() - res.time > CHAT_STREAM_EXPIRE) return await $.removeCache(`chat_${userId}`)
        return res
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
