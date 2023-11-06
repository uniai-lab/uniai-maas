/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { IncludeOptions, Op } from 'sequelize'
import md5 from 'md5'
import { Stream } from 'stream'
import { createParser } from 'eventsource-parser'
import { ChatModelEnum, ChatRoleEnum } from '@interface/Enum'
import { ChatStreamCache, UserTokenCache } from '@interface/Cache'
import { ConfigResponse } from '@interface/controller/WeChat'
import { GPTChatStreamResponse } from '@interface/OpenAI'
import { GLMChatStreamResponse } from '@interface/GLM'
import { SPKChatResponse } from '@interface/Spark'
import $ from '@util/util'
import { ChatMessage } from '@interface/controller/UniAI'
import { EggFile } from 'egg-multipart'

const WEEK = 7 * 24 * 60 * 60 * 1000
const PAGE_LIMIT = 6
const CHAT_BACKTRACK = 10
const CHAT_STREAM_EXPIRE = 3 * 60 * 1000
const ERROR_CHAT_ID = 0.1
const {
    WX_DEFAULT_CHAT_MODEL,
    WX_DEFAULT_RESOURCE_MODEL,
    WX_DEFAULT_EMBED_MODEL,
    WX_APP_ID,
    WX_APP_AUTH_URL,
    WX_APP_SECRET
} = process.env

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class WeChat extends Service {
    // get app configs to user
    async getConfig() {
        const res = await this.ctx.model.Config.findAll({
            where: { isDel: false, isEffect: true },
            attributes: ['key', 'value', 'isJson']
        })
        const data: ConfigResponse = {}
        for (const item of res) data[item.key] = item.isJson ? $.json(item.value) : item.value
        return data
    }

    // use wechat to login, get code, return new user
    async signIn(code: string, fid?: number) {
        const { ctx } = this

        // get access_token, openid, unionid
        const url = `${WX_APP_AUTH_URL}?grant_type=authorization_code&appid=${WX_APP_ID}&secret=${WX_APP_SECRET}&js_code=${code}`
        const res = await $.get<undefined, WXAuthCodeAPI>(url)
        if (!res.openid || !res.session_key) throw new Error('Fail to get openid or session key')

        const config = await this.getConfig()
        // try to create user
        const [user, created] = await ctx.model.User.findOrCreate({
            where: { wxOpenId: res.openid },
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
            // add free chat dialog
            await this.dialog(user.id)
            // add default dialog resource
            if (config.INIT_RESOURCE_ID) await this.dialog(user.id, parseInt(config.INIT_RESOURCE_ID))
            // give share reward
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
            // decode user info
            const res = $.decryptData(encryptedData, iv, user.wxSessionKey, WX_APP_ID)
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

        const config = await this.getConfig()
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

        const config = await this.getConfig()
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
                resourceId: { [Op.ne]: null },
                isEffect: true,
                isDel: false
            },
            attributes: ['id'],
            order: [['updatedAt', 'DESC']],
            include: {
                model: ctx.model.Resource,
                attributes: ['id', 'page', 'tokens', 'fileName', 'fileSize', 'filePath', 'updatedAt', 'typeId'],
                include: [{ model: ctx.model.ResourceType, attributes: ['type', 'description'] }]
            }
        })
    }

    // find or create a dialog
    async dialog(userId: number, resourceId: number | null = null, include?: IncludeOptions) {
        const { ctx } = this
        let name = ''
        if (resourceId) {
            // check resource
            const resource = await ctx.model.Resource.findOne({
                where: { id: resourceId, isEffect: true, isDel: false }
            })
            if (!resource) throw new Error('Can not find the resource')
            name = resource.fileName
        }

        // create or find the dialog
        const [res, created] = await ctx.model.Dialog.findOrCreate({ where: { userId, resourceId }, include })
        if (created) {
            const content =
                ctx.__('Im AI model') + resourceId ? ctx.__('finish reading', name) : ctx.__('feel free to chat')
            res.chats = [
                await ctx.model.Chat.create({
                    dialogId: res.id,
                    role: ChatRoleEnum.ASSISTANT,
                    content
                })
            ]
        }

        return res
    }

    // list all the chats from a user and dialog
    async listChat(userId: number, dialogId: number = 0, limit: number = CHAT_BACKTRACK) {
        const { ctx } = this
        const include: IncludeOptions = {
            model: ctx.model.Chat,
            limit,
            order: [['createdAt', 'DESC']],
            where: { isDel: false, isEffect: true }
        }
        const dialog = dialogId
            ? await ctx.model.Dialog.findOne({ where: { id: dialogId, userId }, include })
            : await this.dialog(userId, null, include)
        if (!dialog) throw new Error('Can not find dialog')
        dialog.chats.reverse()
        return dialog
    }

    // chat
    async chat(input: string, userId: number, dialogId: number = 0) {
        const { ctx } = this
        // check processing chat stream
        const check = await this.getChat(userId)
        if (check && !check.chatId) throw new Error('You have another processing chat')

        // check user chat chance
        const user = await ctx.model.UserChance.findOne({ where: { userId } })
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree <= 0 && user.chatChance <= 0) throw new Error('Chance of chat not enough')

        // dialogId ? dialog chat : free chat
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId ? { id: dialogId, userId } : { resourceId: null, userId },
            include: { model: ctx.model.Chat, limit: CHAT_BACKTRACK, order: [['id', 'desc']] }
        })
        if (!dialog) throw new Error('Dialog is invalid')
        dialog.chats.reverse()
        const resourceId = dialog.resourceId

        const prompts: ChatMessage[] = []

        // add related resource
        if (resourceId) {
            let content = `${ctx.__('you are')}${ctx.__('document content start')}`
            // query resource
            const query = [{ role: ChatRoleEnum.USER, content: input }]
            const pages = await ctx.service.uniAI.queryResource(query, resourceId, WX_DEFAULT_EMBED_MODEL, PAGE_LIMIT)
            // add resource to prompt
            for (const item of pages) content += `\n${item.content}`
            content += `\n${ctx.__('document content end')}${ctx.__('answer according to')}`
            prompts.push({ role: ChatRoleEnum.SYSTEM, content })
        }

        // add user chat history
        for (const { role, content } of dialog.chats) prompts.push({ role: role, content })

        prompts.push({ role: ChatRoleEnum.USER, content: input })

        console.log(prompts)

        const model: ChatModelEnum = resourceId ? WX_DEFAULT_RESOURCE_MODEL : WX_DEFAULT_CHAT_MODEL

        // set chat stream cache
        const cache: ChatStreamCache = {
            chatId: 0,
            dialogId: dialog.id,
            content: '',
            resourceId,
            model,
            time: new Date().getTime()
        }
        await $.setCache(`chat_${userId}`, cache)

        // start chat stream
        const stream = (await ctx.service.uniAI.chat(prompts, true, model)) as Stream
        const parser = createParser(event => {
            try {
                if (event.type === 'event') {
                    if (model === 'GPT') {
                        const obj = $.json<GPTChatStreamResponse>(event.data)
                        if (obj?.choices[0].delta?.content) cache.content += obj.choices[0].delta.content
                    }
                    if (model === 'GLM') {
                        const obj = $.json<GLMChatStreamResponse>(event.data)
                        if (obj?.choices[0].delta?.content) cache.content += obj.choices[0].delta.content
                    }
                    if (model === 'SPARK') {
                        const obj = $.json<SPKChatResponse>(event.data)
                        if (obj?.payload.choices.text[0].content) cache.content += obj.payload.choices.text[0].content
                    }
                    $.setCache(`chat_${userId}`, cache)
                }
            } catch (e) {
                cache.chatId = ERROR_CHAT_ID
                $.setCache(`chat_${userId}`, cache)
            }
        })

        // add listen stream
        stream.on('data', (buff: Buffer) => parser.feed(buff.toString('utf8')))
        stream.on('error', (e: Error) => {
            cache.content = e.message
            cache.chatId = ERROR_CHAT_ID
            $.setCache(`chat_${userId}`, cache)
        })
        stream.on('end', async () => {
            if (user.chatChanceFree > 0) await user.decrement({ chatChanceFree: 1 })
            else await user.decrement({ chatChance: 1 })

            // save assistant response
            if (cache.content) {
                const chat = await ctx.model.Chat.create({
                    dialogId: cache.dialogId,
                    resourceId,
                    role: ChatRoleEnum.ASSISTANT,
                    content: cache.content,
                    model
                })
                cache.chatId = chat.id
            } else cache.chatId = ERROR_CHAT_ID
            $.setCache(`chat_${userId}`, cache)
        })

        // save user prompt
        return await ctx.model.Chat.create({ dialogId: dialog.id, role: ChatRoleEnum.USER, content: input })
    }

    // get current chat stream by userId
    async getChat(userId: number) {
        const res = await $.getCache<ChatStreamCache>(`chat_${userId}`)
        // expire, remove chat cache
        if (res && new Date().getTime() - res.time > CHAT_STREAM_EXPIRE) return await $.removeCache(`chat_${userId}`)
        return res
    }
    async addResource(file: EggFile, userId: number, typeId: number) {
        const { ctx } = this
        const chance = await ctx.model.UserChance.findOne({
            where: { userId },
            attributes: ['id', 'uploadChanceFree', 'uploadChance']
        })
        if (!chance) throw new Error('Fail to find user')
        if (chance.uploadChance + chance.uploadChanceFree <= 0) throw new Error('Chance of upload not enough')

        const upload = await ctx.service.uniAI.upload(file)
        const res = await ctx.service.uniAI.embedding(
            WX_DEFAULT_EMBED_MODEL,
            undefined,
            upload.content,
            upload.fileName,
            upload.filePath,
            upload.fileSize,
            userId,
            typeId
        )

        if (chance.uploadChanceFree > 0) await chance.decrement('uploadChanceFree')
        else if (chance.uploadChance > 0) await chance.decrement('uploadChance')
        else throw new Error('Fail to reduce upload chance')
        console.log('111111')

        return res
    }

    // get user and reset free chat/upload chance
    async getUserResetChance(id: number) {
        const { ctx } = this
        const user = await ctx.model.User.findOne({
            where: { id, isDel: false, isEffect: true },
            include: [{ model: ctx.model.UserChance }]
        })
        if (!user || !user.chance) throw new Error('Fail to find user')

        const config = await this.getConfig()
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
