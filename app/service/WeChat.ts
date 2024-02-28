/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { EggFile } from 'egg-multipart'
import { Op } from 'sequelize'
import { PassThrough, Readable } from 'stream'
import { statSync } from 'fs'
import { AuditProvider } from '@interface/Enum'
import { AdvCache, ChatStreamCache, WXAccessTokenCache, WXAppQRCodeCache } from '@interface/Cache'
import {
    WXAccessTokenRequest,
    WXAccessTokenResponse,
    WXAuthCodeRequest,
    WXAuthCodeResponse,
    WXGetQRCodeRequest,
    WXGetQRCodeResponse,
    WXMsgCheckRequest,
    WXMsgCheckResponse
} from '@interface/controller/WeChat'
import $ from '@util/util'
import FormData from 'form-data'
import { ChatMessage, ChatModelProvider, ChatResponse, ChatRoleEnum, EmbedModelProvider, IFlyTekChatModel } from 'uniai'
import { ChatResponse as WXChatResponse } from '@interface/controller/WeChat'
import { ConfigMenu, ConfigMenuV2, ConfigTask, ConfigVIP } from '@interface/Config'

const ONE_DAY = 24 * 60 * 60 * 1000
const PAGE_LIMIT = 6
const CHAT_PAGE_SIZE = 10
const CHAT_MAX_PAGE = 20
const DIALOG_PAGE_SIZE = 10
const DIALOG_PAGE_LIMIT = 20
const CHAT_STREAM_EXPIRE = 3 * 60 * 1000
const SMS_EXPIRE = 5 * 60 * 1000
const SMS_COUNT = 5
const QR_CODE_EXPIRE = 30 // 30 seconds

// WeChat API
const WX_AUTH_URL = 'https://api.weixin.qq.com/sns/jscode2session'
const WX_ACCESS_TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token'
// const WX_PHONE_URL = 'https://api.weixin.qq.com/wxa/business/getuserphonenumber'
const WX_MSG_CHECK_URL = 'https://api.weixin.qq.com/wxa/msg_sec_check' // use POST
const WX_MEDIA_CHECK_URL = 'https://api.weixin.qq.com/wxa/img_sec_check' // use POST
const WX_QR_CODE_URL = 'https://api.weixin.qq.com/wxa/getwxacodeunlimit'
const { WX_APP_ID, WX_APP_SECRET } = process.env
const PROVIDER = ChatModelProvider.IFlyTek
const MODEL = IFlyTekChatModel.SPARK_V3

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class WeChat extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        return await this.service.uniAI.getConfig<T>(key)
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
    async login(code?: string, phone?: string, fid?: number) {
        const { ctx } = this
        const where: { wxOpenId?: string; phone?: string } = {}
        // phone login
        if (phone) {
            const res = await ctx.model.PhoneCode.findOne({
                where: { phone, createdAt: { [Op.gte]: new Date(Date.now() - SMS_EXPIRE) } },
                order: [['id', 'DESC']]
            })
            if (!res) throw new Error('Can not find the phone number')
            await res.increment('count')

            // validate code
            if (res.count >= SMS_COUNT) throw new Error('Try too many times')
            if (res.code !== code) throw new Error('Code is invalid')
            where.phone = phone
        }
        // wechat login
        else if (code) {
            // get access_token, openid, unionid from WeChat API
            const { openid } = await $.get<WXAuthCodeRequest, WXAuthCodeResponse>(WX_AUTH_URL, {
                grant_type: 'authorization_code',
                appid: WX_APP_ID,
                secret: WX_APP_SECRET,
                js_code: code
            })
            if (!openid) throw new Error('Fail to get WeChat openid')
            where.wxOpenId = openid
            // find user and sign in
        } else throw new Error('Phone or code can not be null')

        // find or create a user, then sign in
        const { id } =
            (await ctx.model.User.findOne({ where, attributes: ['id'] })) ||
            (await ctx.service.user.create(where.phone, where.wxOpenId, fid))
        const user = await ctx.service.user.signIn(id)

        // add free chat dialog if not existed
        if (
            !(await ctx.model.Dialog.count({
                where: { userId: user.id, resourceId: null, isEffect: true, isDel: false }
            }))
        )
            await ctx.service.weChat.addDialog(user.id)

        // add default resource dialog if not existed
        const resourceId = parseInt(await this.getConfig('INIT_RESOURCE_ID'))
        if (
            !(await ctx.model.Dialog.count({ where: { userId: user.id, resourceId } })) &&
            (await ctx.model.Resource.count({ where: { id: resourceId } }))
        )
            await ctx.service.weChat.addDialog(user.id, resourceId)

        return user
    }

    /* user sign phone number
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

    // set QR code token
    async setQRCodeToken(qrToken: string, id: number, token: string | null = null) {
        const cache: WXAppQRCodeCache = { id, token }
        await this.app.redis.setex(`wx_app_qrcode_${qrToken}`, QR_CODE_EXPIRE, JSON.stringify(cache))
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
                include: [{ model: ctx.model.ResourceType, attributes: ['id', 'name', 'description'] }]
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
        const content =
            ctx.__('Im AI model') + (fileName ? ctx.__('finish reading', fileName) : ctx.__('feel free to chat'))

        dialog.chats = await ctx.model.Chat.bulkCreate([
            {
                dialogId: dialog.id,
                role: ChatRoleEnum.ASSISTANT,
                content: $.contentFilter(content).text,
                model: PROVIDER,
                subModel: MODEL
            }
        ])

        return dialog
    }

    // delete a dialog
    async delDialog(userId: number, id: number | null = null) {
        const { ctx } = this
        const dialog = await ctx.model.Dialog.findOne({ where: id ? { id, userId } : { userId, resourceId: null } })
        if (!dialog) throw new Error('Can not find the dialog')

        if (id) {
            dialog.isDel = true
            await dialog.save()
        } else await ctx.model.Chat.update({ isDel: true }, { where: { dialogId: dialog.id } })
    }

    // list all the chats from a user and dialog
    async listChat(userId: number, dialogId?: number, lastId?: number, pageSize: number = CHAT_PAGE_SIZE) {
        const { ctx } = this
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId
                ? { id: dialogId, userId, isEffect: true, isDel: false }
                : { resourceId: null, userId, isEffect: true, isDel: false },
            attributes: ['id']
        })
        if (!dialog) throw new Error('Can not find dialog')

        const res = await ctx.model.Chat.findAll({
            limit: pageSize > CHAT_MAX_PAGE ? CHAT_MAX_PAGE : pageSize,
            order: [['id', 'DESC']],
            where: {
                dialogId: dialog.id,
                id: lastId ? { [Op.lt]: lastId } : { [Op.lte]: await ctx.model.Chat.max('id') },
                isEffect: true,
                isDel: false,
                model: PROVIDER
            }
        })

        return res.reverse()
    }

    // chat
    async chat(input: string, userId: number, dialogId: number = 0, sse: boolean = false) {
        const { ctx, app } = this

        if (!sse) {
            // check processing chat stream cache
            const check = await this.getChat(userId)
            if (check && !check.chatId) throw new Error('You have another processing chat')
        }

        // check user chat chance
        const user = await ctx.model.User.findByPk(userId, { attributes: ['id', 'chatChance', 'chatChanceFree'] })
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree + user.chatChance <= 0) throw new Error('Chat chance not enough')

        // dialogId ? dialog chat : free chat
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId
                ? { id: dialogId, userId, isEffect: true, isDel: false }
                : { resourceId: null, userId, isEffect: true, isDel: false },
            attributes: ['id', 'resourceId'],
            include: {
                model: ctx.model.Chat,
                limit: CHAT_PAGE_SIZE,
                order: [['id', 'desc']],
                attributes: ['role', 'content'],
                where: {
                    isEffect: true,
                    isDel: false,
                    model: PROVIDER
                }
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
            const embedModel = EmbedModelProvider.Other
            const pages = await ctx.service.uniAI.queryResource(query, resourceId, embedModel, PAGE_LIMIT)
            // add resource to prompt
            for (const item of pages) content += `\n${item.content}`
            content += `\n${ctx.__('document content end')}\n${ctx.__('answer according to')}`
            prompts.push({ role: SYSTEM, content })
        }

        prompts.push({ role: USER, content: input })

        // WeChat require to audit input content
        const isEffect = (await ctx.service.uniAI.audit(input, AuditProvider.WX)).flag

        // start chat stream
        const res = await ctx.service.uniAI.chat(prompts, true, PROVIDER, MODEL)
        if (!(res instanceof Readable)) throw new Error('Chat stream is not readable')

        if (sse) {
            const cache: WXChatResponse = {
                chatId: 0,
                role: ChatRoleEnum.ASSISTANT,
                content: '',
                dialogId,
                resourceId,
                model: PROVIDER,
                subModel: MODEL,
                avatar: await ctx.service.weChat.getConfig('DEFAULT_AVATAR_AI'),
                isEffect
            }

            const output = new PassThrough()
            res.on('data', (buff: Buffer) => {
                const obj = $.json<ChatResponse>(buff.toString())
                if (obj && obj.content) {
                    cache.content += obj.content
                    cache.subModel = obj.model
                    output.write(JSON.stringify(cache))
                }
            })
            res.on('error', e => {
                cache.content += e.message
                cache.isEffect = false
            })
            res.on('end', () => {
                // reduce user chat chance
                if (user.chatChanceFree > 0) user.chatChanceFree--
                else if (user.chatChance > 0) user.chatChance--
                user.save()
            })
            res.on('close', async () => {
                // save user chat
                if (input)
                    await ctx.model.Chat.create({
                        dialogId,
                        role: USER,
                        content: input,
                        model: cache.model,
                        subModel: cache.subModel,
                        isEffect: cache.isEffect
                    })
                // save assistant chat
                if (cache.content) {
                    const chat = await ctx.model.Chat.create({
                        dialogId,
                        role: ASSISTANT,
                        content: cache.content,
                        model: cache.model,
                        subModel: cache.subModel,
                        isEffect: cache.isEffect
                    })
                    cache.chatId = chat.id
                }
                output.end(JSON.stringify(cache))
            })

            return output as Readable
        } else {
            // set chat stream cache, should after chat stream started
            const cache: ChatStreamCache = {
                chatId: 0,
                dialogId,
                resourceId,
                content: '',
                model: PROVIDER,
                subModel: MODEL,
                time: Date.now(),
                isEffect
            }
            if (isEffect) await app.redis.set(`chat_${userId}`, JSON.stringify(cache))

            // save user prompt
            const chat = await ctx.model.Chat.create({
                dialogId,
                role: USER,
                content: input,
                model: PROVIDER,
                subModel: MODEL,
                isEffect
            })

            res.on('data', (buff: Buffer) => {
                const obj = $.json<ChatResponse>(buff.toString())
                if (obj) {
                    cache.content += obj.content
                    cache.subModel = obj.model
                    if (isEffect) app.redis.set(`chat_${userId}`, JSON.stringify(cache))
                }
            })
            res.on('error', e => {
                cache.content += e.message
                cache.isEffect = false
                chat.isEffect = false
                chat.save()
            })
            res.on('end', () => {
                // reduce user chat chance
                if (user.chatChanceFree > 0) user.chatChanceFree--
                else if (user.chatChance > 0) user.chatChance--
                user.save()
            })
            res.on('close', async () => {
                // save assistant response
                if (cache.content) {
                    const chat = await ctx.model.Chat.create({
                        dialogId: cache.dialogId,
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
    }

    // get current chat stream by userId
    async getChat(userId: number) {
        const { app } = this
        const res = $.json<ChatStreamCache>(await app.redis.get(`chat_${userId}`))
        // expire, remove chat cache
        if (res) if (Date.now() - res.time > CHAT_STREAM_EXPIRE || res.chatId) app.redis.del(`chat_${userId}`)
        return res
    }

    // update WeChat name, avatar
    async updateUser(id: number, params: { name?: string; avatar?: string }) {
        const { ctx } = this
        const user = await ctx.model.User.findByPk(id)
        if (!user) throw new Error('Fail to find')

        // update user
        if (params.name) user.name = params.name
        if (params.avatar) user.avatar = $.file2base64(params.avatar, true)

        return await user.save()
    }

    // add a new resource
    async upload(file: EggFile, userId: number, typeId: number) {
        const { ctx } = this
        const user = await ctx.model.User.findByPk(userId, { attributes: ['id', 'uploadChanceFree', 'uploadChance'] })
        if (!user) throw new Error('Fail to find user')
        if (user.uploadChance + user.uploadChanceFree <= 0) throw new Error('Upload chance not enough')

        // upload resource to oss
        let resource = await ctx.service.uniAI.upload(file, userId, typeId)

        // embed resource content
        resource = (await ctx.service.uniAI.embedding(EmbedModelProvider.Other, resource.id)).resource

        // audit resource content
        const { flag } = await ctx.service.uniAI.audit(resource.content)
        if (!flag) {
            resource.isEffect = flag
            await resource.save()
        }

        // split pages as images
        resource = await this.resource(resource.id)

        // reduce user upload chance
        if (user.uploadChanceFree > 0) user.uploadChanceFree--
        else if (user.uploadChance > 0) user.uploadChance--
        await user.save()

        return resource
    }

    // find resource, pages by ID
    async resource(id: number) {
        const { ctx } = this
        const res = await ctx.model.Resource.findByPk(id, {
            attributes: ['id', 'fileName', 'fileSize', 'fileExt', 'filePath', 'content', 'isEffect', 'isDel'],
            include: { model: ctx.model.Page, attributes: ['filePath'], order: ['page', 'asc'] }
        })
        if (!res) throw new Error('Can not find the resource by ID')

        // pages not found, generate pages
        if (!res.pages.length) {
            // get file
            const path = await $.getFile(res.filePath)

            // file not on minio server, upload
            if (!res.filePath.startsWith('minio/')) {
                res.fileSize = statSync(path).size
                res.filePath = await $.putOSS(path)
            }

            // convert to page imgs
            const imgs = await $.convertIMG(path)
            if (!imgs.length) throw new Error('Fail to convert to imgs')

            // upload and save pages
            const pages: string[] = []
            for (const i in imgs) pages.push(await $.putOSS(imgs[i]))
            res.pages = await ctx.model.Page.bulkCreate(
                pages.map((v, i) => ({ resourceId: res.id, page: i + 1, filePath: v }))
            )
            res.page = pages.length
            await res.save()
        }
        return res
    }

    // generate file url
    url(path: string, name?: string) {
        return (
            `${this.ctx.request.URL.origin}/wechat/file?path=${path}` +
            (name ? `&name=${encodeURIComponent(name)}` : '')
        )
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

    // get WeChat mini app QR Code with scene
    async getQRCode(page: string, scene: string) {
        const token = await this.getAccessToken()
        const base64 = await $.post<WXGetQRCodeRequest, string>(
            `${WX_QR_CODE_URL}?access_token=${token}`,
            { scene, page, env_version: 'release', check_path: true },
            { responseEncoding: 'base64' }
        )
        const json = Buffer.from(base64, 'base64').toString('utf-8')
        const res = $.json<WXGetQRCodeResponse>(json)
        if (!res) return `data:image/png;base64,${base64}`
        else {
            console.error(res)
            await this.app.redis.del('WX_ACCESS_TOKEN')
            throw new Error(res.errmsg)
        }
    }

    // watch adv reward
    async watchAdv(userId: number) {
        const { ctx, app } = this
        const res = $.json<AdvCache>(await app.redis.get(`adv_${userId}`))
        const now = Date.now()
        const limit = parseInt(await this.getConfig('ADV_REWARD_LIMIT_COUNT'))
        if (res && now - res.time <= ONE_DAY && res.count >= limit) throw new Error('Adv too many times one day')

        const user = await ctx.model.User.findByPk(userId, { attributes: ['id', 'chatChance'] })
        if (!user) throw new Error('Invalid user')

        user.chatChance += parseInt(await this.getConfig('ADV_REWARD_CHAT_CHANCE'))
        await user.save()

        const cache: AdvCache = {
            count: (res?.count || 0) + 1,
            time: now - (res?.time || 0) > ONE_DAY ? now : res!.time
        }
        await app.redis.set(`adv_${userId}`, JSON.stringify(cache))
        return cache
    }
}
