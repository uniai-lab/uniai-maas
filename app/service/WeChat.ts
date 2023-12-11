/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { EggFile } from 'egg-multipart'
import { IncludeOptions, Op, WhereOptions } from 'sequelize'
import { Readable } from 'stream'
import { createParser } from 'eventsource-parser'
import { basename, extname } from 'path'
import { statSync } from 'fs'
import md5 from 'md5'
import { ChatModelEnum, ChatRoleEnum, ChatSubModelEnum, EmbedModelEnum, OSSEnum } from '@interface/Enum'
import { ChatStreamCache, UserCache } from '@interface/Cache'
import { GPTChatStreamResponse } from '@interface/OpenAI'
import { GLMChatStreamResponse } from '@interface/GLM'
import { SPKChatResponse } from '@interface/Spark'
import { ChatMessage } from '@interface/controller/UniAI'
import { ConfigMenu, ConfigMenuV2, ConfigTask, ConfigVIP } from '@interface/controller/WeChat'
import $ from '@util/util'

const WEEK = 7 * 24 * 60 * 60 * 1000
const PAGE_LIMIT = 6
const CHAT_BACKTRACK = 10
const CHAT_STREAM_EXPIRE = 3 * 60 * 1000
const ERROR_CHAT_ID = 0.1
const BASE64_IMG_TYPE = 'data:image/jpeg;base64,'
const DEFAULT_CHAT_CHANCE = 0
const DEFAULT_UPLOAD_CHANCE = 0
const DEFAULT_UPLOAD_SIZE = 5 * 1024 * 1024
const DEFAULT_LEVEL = 0
const { WX_APP_ID, WX_APP_AUTH_URL, WX_APP_SECRET, OSS_TYPE } = process.env

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class WeChat extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        return await this.ctx.service.uniAI.getConfig<T>(key)
    }

    // get all user needed configs
    async getUserConfig() {
        return {
            appName: await this.getConfig('APP_NAME'),
            appVersion: await this.getConfig('APP_VERSION'),
            footer: await this.getConfig('FOOT_TIP'),
            footerCopy: await this.getConfig('FOOT_COPY'),
            officialAccount: await this.getConfig('OFFICIAL'),
            shareTitle: await this.getConfig('SHARE_TITLE'),
            shareDesc: await this.getConfig('SHARE_DESC'),
            shareImg: await this.getConfig('SHARE_IMG'),
            userBackground: await this.getConfig('USER_BACKGROUND_IMG'),
            menu: await this.getConfig<ConfigMenu[]>('USER_MENU'),
            task: await this.getConfig<ConfigTask[]>('USER_TASK'),
            vip: await this.getConfig<ConfigVIP[]>('USER_VIP'),
            menuMember: await this.getConfig<ConfigMenuV2>('USER_MENU_MEMBER'),
            menuInfo: await this.getConfig<ConfigMenuV2>('USER_MENU_INFO'),
            menuShare: await this.getConfig<ConfigMenuV2>('USER_MENU_SHARE'),
            menuFocus: await this.getConfig<ConfigMenuV2>('USER_MENU_FOCUS'),
            menuAdv: await this.getConfig<ConfigMenuV2>('USER_MENU_ADV')
        }
    }

    // get all tabs of index page
    async getTab(pid?: number) {
        const where: WhereOptions = { isEffect: true, isDel: false }
        if (pid !== undefined) where.pid = pid
        return await this.ctx.model.UserResourceTab.findAll({ where })
    }

    // get announcements
    async announce() {
        return await this.ctx.model.Announce.findAll({ where: { open: true } })
    }

    // use WeChat to login, get code, return new user
    async login(code: string, fid?: number) {
        const { ctx, app } = this

        // get access_token, openid, unionid from WeChat API
        const { openid, session_key } = await $.get<WXAuthCodeRequest, WXAuthCodeResponse>(WX_APP_AUTH_URL, {
            grant_type: 'authorization_code',
            appid: WX_APP_ID,
            secret: WX_APP_SECRET,
            js_code: code
        })
        if (!openid || !session_key) throw new Error('Fail to get WeChat openid or session key')

        // try to create new user or find user
        const now = new Date()
        let user = await ctx.model.User.findOne({
            where: { wxOpenId: openid },
            include: ctx.model.UserChance
        })
        // create a new user
        if (!user) {
            user = await ctx.model.User.create({
                wxOpenId: openid,
                avatar: await this.getConfig('DEFAULT_AVATAR_USER')
            })
            user.name = `${await this.getConfig('DEFAULT_USERNAME')} NO.${user.id}`
            user.chance = await ctx.model.UserChance.create({
                userId: user.id,
                level: DEFAULT_LEVEL,
                uploadSize: DEFAULT_UPLOAD_SIZE,
                chatChance: DEFAULT_CHAT_CHANCE,
                chatChanceUpdateAt: now,
                chatChanceFree: parseInt(await this.getConfig('DEFAULT_FREE_CHAT_CHANCE')),
                chatChanceFreeUpdateAt: now,
                uploadChance: DEFAULT_UPLOAD_CHANCE,
                uploadChanceUpdateAt: now,
                uploadChanceFree: parseInt(await this.getConfig('DEFAULT_FREE_UPLOAD_CHANCE')),
                uploadChanceFreeUpdateAt: now
            })
            // give share reward
            if (fid) await this.shareReward(fid)
        }

        // add free chat dialog
        await this.dialog(user.id)
        // add default resource dialog
        const id = parseInt(await this.getConfig('INIT_RESOURCE_ID'))
        const count = await ctx.model.Resource.count({ where: { id } })
        if (count) await this.dialog(user.id, id)
        // check banned or invalid user
        if (user.isDel || !user.isEffect) throw new Error('User is invalid')

        // set login token
        user.token = md5(`${openid}${now.getTime()}${code}`)
        user.tokenTime = now
        user.wxSessionKey = session_key

        // reset week free chat and upload
        if (now.getTime() - user.chance.chatChanceFreeUpdateAt.getTime() > WEEK) {
            user.chance.chatChanceFree = parseInt(await this.getConfig('DEFAULT_FREE_CHAT_CHANCE'))
            user.chance.chatChanceFreeUpdateAt = now
            await user.chance.save()
        }
        if (now.getTime() - user.chance.uploadChanceFreeUpdateAt.getTime() > WEEK) {
            user.chance.uploadChanceFree = parseInt(await this.getConfig('DEFAULT_FREE_UPLOAD_CHANCE'))
            user.chance.uploadChanceFreeUpdateAt = now
            await user.chance.save()
        }

        // refresh cache
        const cache: UserCache = {
            ...user.dataValues,
            tokenTime: user.tokenTime.getTime(),
            chance: {
                ...user.chance.dataValues,
                chatChanceUpdateAt: user.chance.chatChanceUpdateAt.getTime(),
                uploadChanceUpdateAt: user.chance.uploadChanceUpdateAt.getTime(),
                chatChanceFreeUpdateAt: user.chance.chatChanceFreeUpdateAt.getTime(),
                uploadChanceFreeUpdateAt: user.chance.uploadChanceFreeUpdateAt.getTime()
            }
        }
        await user.save()
        await app.redis.set(`user_${cache.id}`, JSON.stringify(cache))

        // save to user table and return
        return cache
    }

    /* user sign phone number
    async signUp(code: string, openid: string, iv: string, encryptedData: string, fid?: number) {
        const { ctx, app } = this

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

        // save cache
        const { id, token, tokenTime, avatar } = user
        const cache: UserTokenCache = { id, token, time: tokenTime.getTime(), avatar }
        await app.redis.set(`token_${user.id}`, JSON.stringify(cache))
        // save user
        return await user.save()
    }
    */

    // user share and another one sign up, add reward
    async shareReward(userId: number) {
        const { ctx } = this
        const chance = await ctx.model.UserChance.findOne({ where: { userId } })
        if (!chance) throw Error('Fail to reward')

        chance.uploadChance += parseInt(await this.getConfig('SHARE_REWARD_UPLOAD_CHANCE'))
        chance.chatChance += parseInt(await this.getConfig('SHARE_REWARD_CHAT_CHANCE'))
        chance.uploadChanceUpdateAt = new Date()
        chance.chatChanceUpdateAt = new Date()
        return await chance.save()
    }

    // user follow WeChat public account, add reward
    async followReward(unionId: string, openId: string) {
        const { ctx } = this
        const user = await ctx.model.User.findOne({
            where: { wxUnionId: unionId, wxPublicOpenId: null },
            include: ctx.model.UserChance
        })
        if (!user || !user.chance) throw Error('Fail to reward')

        user.chance.chatChance += parseInt(await this.getConfig('FOLLOW_REWARD_CHAT_CHANCE'))
        user.chance.chatChanceUpdateAt = new Date()
        user.wxPublicOpenId = openId // public open id
        await user.chance.save()
        return await user.save()
    }

    // list all dialogs
    async listDialog(userId: number) {
        const { ctx } = this

        return await ctx.model.Dialog.findAll({
            where: { userId, resourceId: { [Op.ne]: null }, isEffect: true, isDel: false },
            attributes: ['id'],
            order: [['updatedAt', 'DESC']],
            include: {
                model: ctx.model.Resource,
                attributes: ['id', 'page', 'tokens', 'fileName', 'fileSize', 'filePath', 'fileExt', 'updatedAt'],
                include: [{ model: ctx.model.ResourceType, attributes: ['id', 'type', 'description'] }]
            }
        })
    }

    // find or create a dialog
    async dialog(userId: number, resourceId: number | null = null, include?: IncludeOptions) {
        const { ctx } = this
        let fileName = ''
        if (resourceId) {
            // check resource
            const resource = await ctx.model.Resource.findOne({
                where: { id: resourceId, isEffect: true, isDel: false },
                attributes: ['fileName']
            })
            if (!resource) throw new Error('Can not find the resource')
            fileName = resource.fileName
        }

        // find the dialog
        let dialog = await ctx.model.Dialog.findOne({ where: { userId, resourceId }, include })
        // create a new dialog
        if (!dialog) {
            dialog = await ctx.model.Dialog.create({ userId, resourceId })
            let content = ctx.__('Im AI model')
            content += fileName ? ctx.__('finish reading', fileName) : ctx.__('feel free to chat')
            dialog.chats = await ctx.model.Chat.bulkCreate([
                { dialogId: dialog.id, role: ChatRoleEnum.ASSISTANT, content }
            ])
        }

        return dialog
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
            : await ctx.model.Dialog.findOne({ where: { resourceId: null, userId }, include })
        if (!dialog) throw new Error('Can not find dialog')
        dialog.chats.reverse()
        return dialog
    }

    // chat
    async chat(input: string, userId: number, dialogId: number = 0) {
        const { ctx, app } = this
        // check processing chat stream
        const check = await this.getChat(userId)
        if (check && !check.chatId) throw new Error('You have another processing chat')

        // check user chat chance
        const user = await ctx.model.UserChance.findOne({ where: { userId } })
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree + user.chatChance <= 0) throw new Error('Chance of chat not enough')

        // dialogId ? dialog chat : free chat
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId ? { id: dialogId, userId } : { resourceId: null, userId },
            include: { model: ctx.model.Chat, limit: CHAT_BACKTRACK, order: [['id', 'desc']] }
        })
        if (!dialog) throw new Error('Can not find dialog')
        dialog.chats.reverse()
        const resourceId = dialog.resourceId

        const { USER, SYSTEM, ASSISTANT } = ChatRoleEnum
        const prompts: ChatMessage[] = []

        // add related resource
        if (resourceId) {
            let content = ctx.__('document content start')
            // query resource
            const query = [{ role: USER, content: input }]
            const embedModel = await this.getConfig<EmbedModelEnum>('WX_EMBED_MODEL')
            const pages = await ctx.service.uniAI.queryResource(query, resourceId, embedModel, PAGE_LIMIT)
            // add resource to prompt
            for (const item of pages) content += `\n${item.content}`
            content += `\n${ctx.__('document content end')}\n${ctx.__('answer according to')}`
            prompts.push({ role: SYSTEM, content })
        }

        // add user chat history
        for (const { role, content } of dialog.chats) prompts.push({ role, content } as ChatMessage)

        prompts.push({ role: USER, content: input })

        console.log(prompts)

        // choose model according to config
        const model = resourceId
            ? await this.getConfig<ChatModelEnum>('WX_RESOURCE_MODEL')
            : await this.getConfig<ChatModelEnum>('WX_CHAT_MODEL')
        const subModel = resourceId
            ? await this.getConfig<ChatSubModelEnum>('WX_RESOURCE_SUB_MODEL')
            : await this.getConfig<ChatSubModelEnum>('WX_CHAT_SUB_MODEL')
        // start chat stream
        const stream = await ctx.service.uniAI.chat(prompts, true, model, subModel)
        if (!(stream instanceof Readable)) throw new Error('Chat stream is not readable')

        // set chat stream cache, should after chat stream started
        const cache: ChatStreamCache = {
            chatId: 0,
            dialogId: dialog.id,
            content: '',
            resourceId,
            model,
            subModel,
            time: Date.now()
        }
        await app.redis.set(`chat_${userId}`, JSON.stringify(cache))

        const parser = createParser(e => {
            try {
                if (e.type === 'event') {
                    if (model === ChatModelEnum.GPT) {
                        const obj = $.json<GPTChatStreamResponse>(e.data)
                        cache.content += obj?.choices[0].delta.content || ''
                        cache.subModel = obj?.model || null
                    }
                    if (model === ChatModelEnum.GLM) {
                        const obj = $.json<GLMChatStreamResponse>(e.data)
                        cache.content += obj?.choices[0].delta.content || ''
                        cache.subModel = obj?.model || null
                    }
                    if (model === ChatModelEnum.SPARK) {
                        const obj = $.json<SPKChatResponse>(e.data)
                        cache.content += obj?.payload.choices.text[0].content || ''
                        cache.subModel = obj?.payload.model || null
                    }
                    app.redis.set(`chat_${userId}`, JSON.stringify(cache))
                }
            } catch (e) {
                cache.chatId = ERROR_CHAT_ID
                cache.content = (e as Error).message
                app.redis.set(`chat_${userId}`, JSON.stringify(cache))
            }
        })

        // add listen stream
        stream.on('data', (buff: Buffer) => parser.feed(buff.toString('utf8')))
        stream.on('error', e => {
            cache.content = e.message
            cache.chatId = ERROR_CHAT_ID
            app.redis.set(`chat_${userId}`, JSON.stringify(cache))
        })
        stream.on('end', async () => {
            if (user.chatChanceFree > 0) await user.decrement({ chatChanceFree: 1 })
            else await user.decrement({ chatChance: 1 })
            await this.updateUserCache(user.userId)

            // save assistant response
            if (cache.content) {
                const chat = await ctx.model.Chat.create({
                    dialogId: cache.dialogId,
                    resourceId,
                    role: ASSISTANT,
                    content: cache.content,
                    model: cache.model,
                    subModel: cache.subModel
                })
                cache.chatId = chat.id
            } else cache.chatId = ERROR_CHAT_ID
            app.redis.set(`chat_${userId}`, JSON.stringify(cache))
        })
        stream.on('close', () => parser.reset())

        // save user prompt
        return await ctx.model.Chat.create({ dialogId: dialog.id, role: USER, content: input })
    }

    // get current chat stream by userId
    async getChat(userId: number) {
        const { app } = this
        const str = await app.redis.get(`chat_${userId}`)
        const res = $.json<ChatStreamCache>(str)
        // expire, remove chat cache
        if (res && Date.now() - res.time > CHAT_STREAM_EXPIRE) {
            await app.redis.del(`chat_${userId}`)
            return null
        }
        return res
    }

    // upload user avatar
    async uploadAvatar(filepath: string, userId: number) {
        if (statSync(filepath).size > parseInt(await this.getConfig('LIMIT_UPLOAD_SIZE')))
            throw new Error('File size exceeds limit')

        const avatar = BASE64_IMG_TYPE + $.file2base64(filepath)
        // update user database
        await this.ctx.model.User.update({ avatar }, { where: { id: userId } })
        // update cache
        await this.updateUserCache(userId)

        return avatar
    }

    async updateUser(id: number, name?: string) {
        if (name) await this.ctx.model.User.update({ name }, { where: { id } })
        // update cache
        const cache = await this.updateUserCache(id)
        return cache
    }

    // update user cache in redis
    async updateUserCache(id: number) {
        const { ctx } = this
        const user = await ctx.model.User.findOne({
            where: { id, isDel: false, isEffect: true },
            include: { model: ctx.model.UserChance }
        })
        if (!user) throw new Error('User is not found')
        const cache: UserCache = {
            ...user.dataValues,
            tokenTime: user.tokenTime.getTime(),
            chance: {
                ...user.chance.dataValues,
                chatChanceUpdateAt: user.chance.chatChanceUpdateAt.getTime(),
                uploadChanceUpdateAt: user.chance.uploadChanceUpdateAt.getTime(),
                chatChanceFreeUpdateAt: user.chance.chatChanceFreeUpdateAt.getTime(),
                uploadChanceFreeUpdateAt: user.chance.uploadChanceFreeUpdateAt.getTime()
            }
        }
        await ctx.app.redis.set(`user_${id}`, JSON.stringify(cache))
        return cache
    }

    // add a new resource
    async upload(file: EggFile, userId: number, typeId: number) {
        const { ctx } = this
        const chance = await ctx.model.UserChance.findOne({
            where: { userId },
            attributes: ['id', 'uploadChanceFree', 'uploadChance']
        })
        if (!chance) throw new Error('Fail to find user chance')
        if (chance.uploadChance + chance.uploadChanceFree <= 0) throw new Error('Upload chance not enough')

        // upload resource to oss
        const resource = await ctx.service.uniAI.upload(file, userId, typeId)
        // embed resource content
        const embedModel = await this.getConfig<EmbedModelEnum>('WX_EMBED_MODEL')
        const res = await ctx.service.uniAI.embedding(embedModel, resource.id)
        // process resource, split pages as images
        await this.resource(res.id)

        // reduce chance
        if (chance.uploadChanceFree > 0) await chance.decrement('uploadChanceFree')
        else if (chance.uploadChance > 0) await chance.decrement('uploadChance')
        else throw new Error('Fail to reduce upload chance')
        await this.updateUserCache(chance.userId)
        return res
    }

    // find resource, pages by ID
    async resource(id: number) {
        const { ctx } = this
        const res = await ctx.model.Resource.findByPk(id, {
            attributes: ['id', 'fileName', 'fileSize', 'fileExt', 'filePath'],
            include: { model: ctx.model.Page, attributes: ['filePath'], order: ['page', 'asc'] }
        })
        if (!res) throw new Error('Can not find the resource by ID')
        if (!res.pages.length) {
            // download file to local path
            const stream = await $.getFileStream(res.filePath)
            const oss = res.filePath.split('/')[0] as OSSEnum
            // if oss type is not consistent, generate a new file name, upload file and update resource filePath
            const path = await $.getStreamFile(stream, basename(res.filePath))
            if (oss !== OSS_TYPE) {
                // update new filePath and fileExt
                res.filePath = await $.putOSS(path, OSS_TYPE)
                res.fileExt = extname(path).replace('.', '')
                res.fileSize = statSync(path).size
            }

            // convert to page imgs
            const imgs = await $.convertIMG(path)
            if (!imgs.length) throw new Error('Fail to convert to imgs')

            // upload and save page imgs
            const pages: string[] = []
            for (const i in imgs) pages.push(await $.putOSS(imgs[i], OSS_TYPE))
            res.pages = await ctx.model.Page.bulkCreate(
                pages.map((v, i) => {
                    return { resourceId: res.id, page: i + 1, filePath: v }
                })
            )
            res.page = pages.length
            return await res.save()
        }
        return res
    }

    // generate file url
    url(path: string, name?: string) {
        const { host, protocol } = this.ctx.request
        return `${protocol}://${host}/wechat/file?path=${path}` + (name ? `&name=${encodeURIComponent(name)}` : '')
    }

    // get file
    async file(path: string) {
        return await $.getFileStream(path)
    }
}
