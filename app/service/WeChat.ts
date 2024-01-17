/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { EggFile } from 'egg-multipart'
import { Op, WhereOptions } from 'sequelize'
import { Readable } from 'stream'
import { createParser } from 'eventsource-parser'
import { basename, extname } from 'path'
import { statSync } from 'fs'
import { ModelProvider, ChatRoleEnum, AuditProvider, EmbedModelEnum, OSSEnum, FlyChatModel } from '@interface/Enum'
import { ChatStreamCache, WXAccessTokenCache } from '@interface/Cache'
import { ChatMessage, ChatResponse } from '@interface/controller/UniAI'
import {
    ConfigMenu,
    ConfigMenuV2,
    ConfigTask,
    ConfigVIP,
    WXAccessTokenRequest,
    WXAccessTokenResponse,
    WXAuthCodeRequest,
    WXAuthCodeResponse,
    WXDecodedData,
    WXMsgCheckRequest,
    WXMsgCheckResponse
} from '@interface/controller/WeChat'
import $ from '@util/util'
import FormData from 'form-data'

const PAGE_LIMIT = 6
const CHAT_PAGE_SIZE = 10
const CHAT_PAGE_LIMIT = 20
const DIALOG_PAGE_SIZE = 10
const DIALOG_PAGE_LIMIT = 20
const CHAT_STREAM_EXPIRE = 3 * 60 * 1000
const BASE64_IMG_TYPE = 'data:image/jpeg;base64,'

// WeChat API
const WX_AUTH_URL = 'https://api.weixin.qq.com/sns/jscode2session'
const WX_ACCESS_TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token'
// const WX_PHONE_URL = 'https://api.weixin.qq.com/wxa/business/getuserphonenumber'
const WX_MSG_CHECK_URL = 'https://api.weixin.qq.com/wxa/msg_sec_check' // use POST
const WX_MEDIA_CHECK_URL = 'https://api.weixin.qq.com/wxa/img_sec_check' // use POST
const { WX_APP_ID, WX_APP_SECRET } = process.env

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
            menu: await this.getConfig<ConfigMenu[]>('USER_MENU'),
            task: await this.getConfig<ConfigTask[]>('USER_TASK'),
            vip: await this.getConfig<ConfigVIP[]>('USER_VIP'),
            menuMember: await this.getConfig<ConfigMenuV2>('USER_MENU_MEMBER'),
            menuInfo: await this.getConfig<ConfigMenuV2>('USER_MENU_INFO'),
            menuShare: await this.getConfig<ConfigMenuV2>('USER_MENU_SHARE'),
            menuFocus: await this.getConfig<ConfigMenuV2>('USER_MENU_FOCUS'),
            menuAdv: await this.getConfig<ConfigMenuV2>('USER_MENU_ADV'),
            showNewApp: await this.getConfig('SHOW_NEW_APP'),
            newAppId: await this.getConfig('NEW_APP_ID')
        }
    }

    // get all tabs of index page
    async getTab(pid: number) {
        return await this.ctx.model.UserResourceTab.findAll({ where: { pid: pid || 0, isEffect: true, isDel: false } })
    }

    // get announcements
    async announce() {
        return await this.ctx.model.Announce.findAll({ where: { open: true } })
    }

    // use WeChat to login, get code, return new user
    async login(code: string, fid?: number) {
        const { ctx } = this

        // get access_token, openid, unionid from WeChat API
        const { openid } = await $.get<WXAuthCodeRequest, WXAuthCodeResponse>(WX_AUTH_URL, {
            grant_type: 'authorization_code',
            appid: WX_APP_ID,
            secret: WX_APP_SECRET,
            js_code: code
        })
        if (!openid) throw new Error('Fail to get WeChat openid')

        // find user and sign in
        const { id } =
            (await ctx.model.User.findOne({ where: { wxOpenId: openid }, attributes: ['id'] })) ||
            (await ctx.service.user.create(null, openid, fid))
        return await ctx.service.user.signIn(id)
    }

    // decrypt WX data
    decryptData(encryptedData: string, iv: string, sessionKey: string, appid: string) {
        const decoded = $.decode(
            Buffer.from(encryptedData, 'base64'),
            'aes-128-cbc',
            Buffer.from(sessionKey, 'base64'),
            Buffer.from(iv, 'base64')
        )

        const decodedData = $.json<WXDecodedData>(decoded)
        if (decodedData?.watermark.appid !== appid) throw new Error('Invalid decrypted data')
        return decodedData
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
    async listDialog(userId: number, lastId?: number, pageSize: number = DIALOG_PAGE_SIZE) {
        const { ctx } = this

        return await ctx.model.Dialog.findAll({
            where: {
                id: lastId ? { [Op.lt]: lastId } : { [Op.lte]: await ctx.model.Dialog.max('id') },
                resourceId: { [Op.ne]: null },
                userId,
                isEffect: true,
                isDel: false
            },
            attributes: ['id'],
            order: [['id', 'DESC']],
            limit: pageSize > DIALOG_PAGE_LIMIT ? DIALOG_PAGE_LIMIT : pageSize,
            include: {
                model: ctx.model.Resource,
                attributes: ['id', 'page', 'fileName', 'fileSize', 'filePath', 'updatedAt', 'isEffect', 'isDel'],
                include: [{ model: ctx.model.ResourceType, attributes: ['id', 'type', 'description'] }]
            }
        })
    }

    // find or add a dialog
    async addDialog(userId: number, resourceId: number | null = null) {
        const { ctx } = this

        let fileName = ''
        // check resource
        if (resourceId) {
            const resource = await ctx.model.Resource.findByPk(resourceId, { attributes: ['fileName'] })
            if (!resource) throw new Error('Can not find the resource')
            fileName = resource.fileName
        }

        // create a new dialog
        const dialog = await ctx.model.Dialog.create({ userId, resourceId })

        // create default dialog chats
        const content = `${ctx.__('Im AI model')}${
            fileName ? ctx.__('finish reading', fileName) : ctx.__('feel free to chat')
        }`
        dialog.chats = await ctx.model.Chat.bulkCreate([
            { dialogId: dialog.id, role: ChatRoleEnum.ASSISTANT, content: $.contentFilter(content).text }
        ])

        return dialog
    }

    // delete a dialog
    async delDialog(userId: number, id: number | null = null) {
        const { ctx } = this
        const dialog = await ctx.model.Dialog.findOne({ where: id ? { id, userId } : { userId, resourceId: null } })
        if (!dialog) throw new Error('Can not find the dialog')

        // delete dialog
        if (id) dialog.isDel = true

        // delete chats
        await ctx.model.Chat.update({ isDel: true }, { where: { dialogId: dialog.id } })
        return await dialog.save()
    }

    // list all the chats from a user and dialog
    async listChat(userId: number, dialogId?: number, lastId?: number, pageSize: number = CHAT_PAGE_SIZE) {
        const { ctx } = this
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId ? { id: dialogId, userId } : { resourceId: null, userId },
            attributes: ['id']
        })
        if (!dialog) throw new Error('Can not find dialog')

        const res = await ctx.model.Chat.findAll({
            limit: pageSize > CHAT_PAGE_LIMIT ? CHAT_PAGE_LIMIT : pageSize,
            order: [['id', 'DESC']],
            where: {
                dialogId: dialog.id,
                id: lastId ? { [Op.lt]: lastId } : { [Op.lte]: await ctx.model.Chat.max('id') },
                isDel: false,
                isEffect: true
            }
        })

        return res.reverse()
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
            where: dialogId
                ? { id: dialogId, userId, isEffect: true, isDel: false }
                : { resourceId: null, userId, isEffect: true, isDel: false },
            include: {
                model: ctx.model.Chat,
                limit: CHAT_PAGE_SIZE,
                order: [['updatedAt', 'desc']],
                where: { isEffect: true, isDel: false }
            }
        })
        if (!dialog) throw new Error('Dialog is not available')
        dialog.chats.reverse()
        dialogId = dialog.id

        const { USER, SYSTEM, ASSISTANT } = ChatRoleEnum
        const prompts: ChatMessage[] = []

        // add user chat history
        for (const { role, content } of dialog.chats) prompts.push({ role, content } as ChatMessage)

        // add related resource
        const resourceId = dialog.resourceId
        if (resourceId) {
            let content = ctx.__('document content start')
            // query resource
            const query = [{ role: USER, content: input }]
            const embedModel = EmbedModelEnum.TextVec
            const pages = await ctx.service.uniAI.queryResource(query, resourceId, embedModel, PAGE_LIMIT)
            // add resource to prompt
            for (const item of pages) content += `\n${item.content}`
            content += `\n${ctx.__('document content end')}\n${ctx.__('answer according to')}`
            prompts.push({ role: SYSTEM, content })
        }

        prompts.push({ role: USER, content: input })
        console.log(prompts)

        // WeChat require to audit input content
        const isEffect = (await ctx.service.uniAI.audit(input, AuditProvider.WX)).flag
        // save user prompt
        const chat = await ctx.model.Chat.create({ dialogId, role: USER, content: input, isEffect })
        const model = ModelProvider.IFlyTek
        const subModel = FlyChatModel.V3

        // start chat stream
        const stream = await ctx.service.uniAI.chat(prompts, true, model, subModel)
        if (!(stream instanceof Readable)) throw new Error('Chat stream is not readable')

        // set chat stream cache, should after chat stream started
        const cache: ChatStreamCache = {
            chatId: 0,
            dialogId,
            resourceId,
            content: '',
            model,
            subModel,
            time: Date.now(),
            isEffect
        }
        if (isEffect) await app.redis.set(`chat_${userId}`, JSON.stringify(cache))

        const parser = createParser(e => {
            if (e.type === 'event') {
                const obj = $.json<ChatResponse>(e.data)
                if (obj) {
                    cache.content += obj.content
                    cache.subModel = obj.model
                    if (isEffect) app.redis.set(`chat_${userId}`, JSON.stringify(cache))
                }
            }
        })

        // add listen stream
        stream.on('data', (buff: Buffer) => parser.feed(buff.toString('utf-8')))
        stream.on('error', e => {
            cache.content += e.message
            cache.isEffect = false
            chat.isEffect = false
            chat.save()
        })
        stream.on('end', async () => {
            if (user.chatChanceFree > 0) await user.decrement({ chatChanceFree: 1 })
            else await user.decrement({ chatChance: 1 })
            ctx.service.user.updateUserCache(user.userId)
        })
        stream.on('close', async () => {
            parser.reset()
            // save assistant response
            if (cache.content) {
                const chat = await ctx.model.Chat.create({
                    dialogId: cache.dialogId,
                    resourceId: cache.resourceId,
                    role: ASSISTANT,
                    content: cache.content,
                    model: cache.model,
                    subModel: cache.subModel,
                    isEffect: cache.isEffect
                })
                cache.chatId = chat.id
                if (isEffect) app.redis.set(`chat_${userId}`, JSON.stringify(cache))
            } else app.redis.del(`chat_${userId}`)
        })
        return chat
    }

    // get current chat stream by userId
    async getChat(userId: number) {
        const { app } = this
        const res = $.json<ChatStreamCache>(await app.redis.get(`chat_${userId}`))
        // expire, remove chat cache
        if (res) if (Date.now() - res.time > CHAT_STREAM_EXPIRE || res.chatId) app.redis.del(`chat_${userId}`)
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
        await this.ctx.service.user.updateUserCache(userId)

        return avatar
    }

    async updateUser(id: number, name?: string) {
        if (name) await this.ctx.model.User.update({ name }, { where: { id } })
        // update cache
        const cache = await this.ctx.service.user.updateUserCache(id)
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

        // audit resource content
        const { flag } = await ctx.service.uniAI.audit(resource.content)
        resource.isEffect = flag

        // embed resource content
        await ctx.service.uniAI.embedding(EmbedModelEnum.TextVec, resource.id)

        // split pages as images
        await this.resource(resource.id)

        // reduce user chance
        if (chance.uploadChanceFree > 0) await chance.decrement('uploadChanceFree')
        else if (chance.uploadChance > 0) await chance.decrement('uploadChance')
        else throw new Error('Fail to reduce upload chance')
        await ctx.service.user.updateUserCache(chance.userId)

        return await resource.save()
    }

    // find resource, pages by ID
    async resource(id: number) {
        const { ctx } = this
        const res = await ctx.model.Resource.findByPk(id, {
            attributes: ['id', 'fileName', 'fileSize', 'fileExt', 'filePath', 'content', 'isEffect', 'isDel'],
            include: { model: ctx.model.Page, attributes: ['filePath'], order: ['page', 'asc'] }
        })
        if (!res) throw new Error('Can not find the resource by ID')

        // extract resource pages
        if (!res.pages.length) {
            // download file to local path
            const stream = await $.getFileStream(res.filePath)
            const oss = res.filePath.split('/')[0] as OSSEnum
            // if oss type is not consistent, generate a new file name, upload file and update resource filePath
            const path = await $.getStreamFile(stream, basename(res.filePath))
            if (oss !== OSSEnum.MIN) {
                // update new filePath and fileExt
                res.filePath = await $.putOSS(path)
                res.fileExt = extname(path).replace('.', '')
                res.fileSize = statSync(path).size
            }

            // convert to page imgs
            const imgs = await $.convertIMG(path)
            if (!imgs.length) throw new Error('Fail to convert to imgs')

            // upload and save page imgs
            const pages: string[] = []
            for (const i in imgs) pages.push(await $.putOSS(imgs[i]))
            res.pages = await ctx.model.Page.bulkCreate(
                pages.map((v, i) => ({ resourceId: res.id, page: i + 1, filePath: v }))
            )
            res.page = pages.length
        }
        return res
    }

    // generate file url
    url(path: string, name?: string) {
        const { host, protocol } = this.ctx.request
        const http = $.isTLS(protocol) || $.isDomain(host) ? 'https' : 'http'
        return `${http}://${host}/wechat/file?path=${path}` + (name ? `&name=${encodeURIComponent(name)}` : '')
    }

    // use WX API to check content
    // image content should be base64
    async contentCheck(content: string, openid: string = '') {
        const token = await this.getAccessToken()
        if ($.isBase64(content)) {
            const form = new FormData()
            form.append('media', Buffer.from(content, 'base64'), { filename: 'test.png' })
            form.append('media_type', 2)
            form.append('openid', openid)
            openid ? form.append('version', 2) : form.append('version', 1)
            form.append('scene', 1)
            const url = `${WX_MEDIA_CHECK_URL}?access_token=${token}`
            const res = await $.post<FormData, WXMsgCheckResponse>(url, form)
            if (res.errcode === 40001) await this.delAccessToken()
            return res
        } else {
            const form: WXMsgCheckRequest = { content, version: openid ? 2 : 1, scene: 1, openid }
            const url = `${WX_MSG_CHECK_URL}?access_token=${token}`
            const res = await $.post<WXMsgCheckRequest, WXMsgCheckResponse>(url, form)
            if (res.errcode === 40001) await this.delAccessToken()
            return res
        }
    }

    // clear access token
    async delAccessToken() {
        await this.app.redis.del('WX_ACCESS_TOKEN')
    }

    // get WX API access token
    async getAccessToken() {
        const cache = await this.app.redis.get('WX_ACCESS_TOKEN')
        const accessToken = $.json<WXAccessTokenCache>(cache)
        const now = Date.now()

        // get access token from cache
        if (accessToken && accessToken.expire > now) return accessToken.token
        // get access token from WX API
        else {
            const res = await $.get<WXAccessTokenRequest, WXAccessTokenResponse>(WX_ACCESS_TOKEN_URL, {
                grant_type: 'client_credential',
                appid: WX_APP_ID,
                secret: WX_APP_SECRET
            })
            if (res && res.access_token && res.expires_in) {
                const cache: WXAccessTokenCache = { expire: now + res.expires_in * 1000, token: res.access_token }
                await this.app.redis.set('WX_ACCESS_TOKEN', JSON.stringify(cache))
                return res.access_token
            } else throw new Error(`Fail to get wx access token, ${res.errcode}:${res.errmsg}`)
        }
    }

    // watch adv reward
    async watchAdv(userId: number) {
        const chance = await this.ctx.model.UserChance.findOne({
            where: { userId },
            attributes: ['id', 'userId', 'chatChance', 'chatChanceUpdateAt']
        })
        if (!chance) throw new Error('Invalid user chance')

        chance.chatChance += parseInt(await this.getConfig('ADV_REWARD_CHAT_CHANCE'))
        chance.chatChanceUpdateAt = new Date()

        await chance.save()
        await this.ctx.service.user.updateUserCache(userId)
    }
}
