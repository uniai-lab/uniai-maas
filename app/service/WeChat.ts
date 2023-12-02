/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { EggFile } from 'egg-multipart'
import { IncludeOptions, Op } from 'sequelize'
import { Readable } from 'stream'
import { createParser } from 'eventsource-parser'
import { basename, extname } from 'path'
import { statSync } from 'fs'
import isJSON from '@stdlib/assert-is-json'
import md5 from 'md5'
import { ChatModelEnum, ChatRoleEnum, OSSEnum } from '@interface/Enum'
import { ChatStreamCache, UserTokenCache } from '@interface/Cache'
import { GPTChatStreamResponse } from '@interface/OpenAI'
import { GLMChatStreamResponse } from '@interface/GLM'
import { SPKChatResponse } from '@interface/Spark'
import { ChatMessage } from '@interface/controller/UniAI'
import { ConfigMenu, ConfigTask } from '@interface/controller/WeChat'
import $ from '@util/util'

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
    WX_APP_SECRET,
    OSS_TYPE
} = process.env

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class WeChat extends Service {
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
            }
        }
        return isJSON(value) ? $.json<T>(value) : (value as T)
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
            menu: (await this.getConfig<ConfigMenu[]>('USER_MENU')) || [],
            task: (await this.getConfig<ConfigTask[]>('USER_TASK')) || []
        }
    }

    // get announcements
    async announce() {
        return await this.ctx.model.Announce.findAll({ where: { open: true } })
    }

    // use WeChat to login, get code, return new user
    async signIn(code: string, fid?: number) {
        const { ctx, app } = this
        // get access_token, openid, unionid
        const res = await $.get<WXAuthCodeRequest, WXAuthCodeResponse>(WX_APP_AUTH_URL, {
            grant_type: 'authorization_code',
            appid: WX_APP_ID,
            secret: WX_APP_SECRET,
            js_code: code
        })
        if (!res.openid || !res.session_key) throw new Error('Fail to get openid or session key')

        // create user chance default params and values
        const chance = {
            level: 0,
            uploadSize: 5e6,
            chatChance: 0,
            chatChanceUpdateAt: new Date(),
            chatChanceFree: Number(await this.getConfig('DEFAULT_FREE_CHAT_CHANCE')),
            chatChanceFreeUpdateAt: new Date(),
            uploadChance: 0,
            uploadChanceUpdateAt: new Date(),
            uploadChanceFree: Number(await this.getConfig('DEFAULT_FREE_UPLOAD_CHANCE')),
            uploadChanceFreeUpdateAt: new Date()
        }

        // try to create user
        const [user, created] = await ctx.model.User.findOrCreate({
            where: { wxOpenId: res.openid },
            defaults: { avatar: await this.getConfig('DEFAULT_AVATAR_USER'), chance },
            include: ctx.model.UserChance
        })

        // banned or invalid user
        if (user.isDel || !user.isEffect) throw new Error('User is banned or invalid')
        // lose user chance? create again
        if (!user.chance) user.chance = await ctx.model.UserChance.create({ ...chance, userId: user.id })

        // first create, set default user info
        if (created) {
            user.name = `${await this.getConfig('DEFAULT_USERNAME')} NO.${user.id}`
            // add free chat dialog
            await this.dialog(user.id)
            // add default resource dialog
            const id = Number(await this.getConfig('INIT_RESOURCE_ID'))
            if (id) {
                const count = await ctx.model.Resource.count({ where: { id } })
                if (count) await this.dialog(user.id, id)
            }
            // give share reward
            if (fid) await this.shareReward(fid)
        }

        // user is existed, update session key
        user.token = md5(`${res.openid}${Date.now()}${code}`)
        user.tokenTime = new Date()
        user.wxSessionKey = res.session_key

        const cache: UserTokenCache = {
            id: user.id,
            token: user.token,
            time: user.tokenTime.getTime()
        }
        await app.redis.set(`token_${user.id}`, JSON.stringify(cache))
        return await user.save()
    }

    // user sign phone number
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

        const cache: UserTokenCache = {
            id: user.id,
            token: user.token,
            time: user.tokenTime.getTime()
        }
        await app.redis.set(`token_${user.id}`, JSON.stringify(cache))
        await user.save()
        return user
    }

    // user share and another one sign up, add reward
    async shareReward(userId: number) {
        const { ctx } = this
        const chance = await ctx.model.UserChance.findOne({ where: { userId } })
        if (!chance) throw Error('Fail to reward')

        chance.uploadChance += Number(await this.getConfig('SHARE_REWARD_UPLOAD_CHANCE'))
        chance.chatChance += Number(await this.getConfig('SHARE_REWARD_CHAT_CHANCE'))
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

        user.chance.chatChance += Number(await this.getConfig('FOLLOW_REWARD_CHAT_CHANCE'))
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
            const content = `${ctx.__('Im AI model')}
            ${resourceId ? ctx.__('finish reading', name) : ctx.__('feel free to chat')}`
            res.chats = [await ctx.model.Chat.create({ dialogId: res.id, role: ChatRoleEnum.ASSISTANT, content })]
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
        if (user.chatChanceFree <= 0 && user.chatChance <= 0) throw new Error('Chance of chat not enough')

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
            const pages = await ctx.service.uniAI.queryResource(query, resourceId, WX_DEFAULT_EMBED_MODEL, PAGE_LIMIT)
            // add resource to prompt
            for (const item of pages) content += `\n${item.content}`
            content += `\n${ctx.__('document content end')}\n${ctx.__('answer according to')}`
            prompts.push({ role: SYSTEM, content })
        }

        // add user chat history
        for (const { role, content } of dialog.chats) prompts.push({ role, content } as ChatMessage)

        prompts.push({ role: USER, content: input })

        console.log(prompts)

        const model: ChatModelEnum = resourceId ? WX_DEFAULT_RESOURCE_MODEL : WX_DEFAULT_CHAT_MODEL

        // set chat stream cache
        const cache: ChatStreamCache = {
            chatId: 0,
            dialogId: dialog.id,
            content: '',
            resourceId,
            model,
            subModel: '',
            time: Date.now()
        }
        await app.redis.set(`chat_${userId}`, JSON.stringify(cache))

        // start chat stream
        const stream = (await ctx.service.uniAI.chat(prompts, true, model)) as Readable
        const parser = createParser(e => {
            try {
                if (e.type === 'event') {
                    if (model === 'GPT') {
                        const obj = $.json<GPTChatStreamResponse>(e.data)
                        cache.content += obj?.choices[0].delta.content || ''
                        cache.subModel = obj?.model || null
                    }
                    if (model === 'GLM') {
                        const obj = $.json<GLMChatStreamResponse>(e.data)
                        cache.content += obj?.choices[0].delta.content || ''
                        cache.subModel = obj?.model || null
                    }
                    if (model === 'SPARK') {
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
    // add a new resource
    async upload(file: EggFile, userId: number, typeId: number) {
        const { ctx } = this
        const chance = await ctx.model.UserChance.findOne({
            where: { userId },
            attributes: ['id', 'uploadChanceFree', 'uploadChance']
        })
        if (!chance) throw new Error('Fail to find user')
        if (chance.uploadChance + chance.uploadChanceFree <= 0) throw new Error('Chance of upload not enough')

        const upload = await ctx.service.uniAI.upload(file, userId, typeId)
        const res = await ctx.service.uniAI.embedding(WX_DEFAULT_EMBED_MODEL, upload.id)
        // process resource, split pages
        await this.resource(res.id)

        // reduce chance
        if (chance.uploadChanceFree > 0) await chance.decrement('uploadChanceFree')
        else if (chance.uploadChance > 0) await chance.decrement('uploadChance')
        else throw new Error('Fail to reduce upload chance')
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
        const { host } = this.ctx.request
        return `https://${host}/wechat/file?path=${path}` + (name ? `&name=${encodeURIComponent(name)}` : '')
    }
    // get file
    async file(path: string) {
        const file = await $.getFileStream(path)
        const name = basename(path)
        return { file, name }
    }
    // get user and reset free chat/upload chance
    async getUserResetChance(id: number) {
        const { ctx } = this
        const user = await ctx.model.User.findOne({
            where: { id, isDel: false, isEffect: true },
            include: [{ model: ctx.model.UserChance }]
        })
        if (!user || !user.chance) throw new Error('Fail to find user')

        const now = new Date()
        // reset free upload
        if (now.getTime() - user.chance.uploadChanceFreeUpdateAt.getTime() > WEEK) {
            user.chance.uploadChanceFree = Number(await this.getConfig('DEFAULT_FREE_UPLOAD_CHANCE'))
            user.chance.uploadChanceFreeUpdateAt = now
            await user.chance.save()
        }
        // reset free chat
        if (now.getTime() - user.chance.chatChanceFreeUpdateAt.getTime() > WEEK) {
            user.chance.chatChanceFree = Number(await this.getConfig('DEFAULT_FREE_CHAT_CHANCE'))
            user.chance.chatChanceFreeUpdateAt = now
            await user.chance.save()
        }
        return user
    }
}
