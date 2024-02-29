/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, HTTPBody, Middleware, HTTPQuery } from '@eggjs/tegg'
import { Readable } from 'stream'
import { basename } from 'path'
import { ChatRoleEnum } from 'uniai'
import auth from '@middleware/authC'
import transaction from '@middleware/transaction'
import log from '@middleware/log'
import captcha from '@middleware/captcha'
import shield from '@middleware/shield'
import { UserContext } from '@interface/Context'
import {
    SMSCodeRequest,
    SMSCodeResponse,
    LoginRequest,
    UserinfoResponse,
    ChatRequest,
    ChatResponse,
    getQRCodeResponse,
    UpdateUserRequest,
    UploadRequest,
    DialogListRequest,
    DialogListResponse,
    ChatListRequest
} from '@interface/controller/Web'
import $ from '@util/util'

@HTTPController({ path: '/web' })
export default class Web {
    // app configs
    @HTTPMethod({ path: '/config', method: HTTPMethodEnum.GET })
    async config(@Context() ctx: UserContext) {
        const data = await ctx.service.web.getUserConfig()
        ctx.service.res.success('Success to list config', data)
    }

    @HTTPMethod({ path: '/file', method: HTTPMethodEnum.GET })
    async file(@Context() ctx: UserContext, @HTTPQuery() path: string, @HTTPQuery() name: string) {
        if (!path) throw new Error('Path is null')

        const data = await ctx.service.uniAI.fileStream(path)
        ctx.service.res.file(data, name || basename(path))
    }

    @Middleware(log(), captcha())
    @HTTPMethod({ path: '/get-sms-code', method: HTTPMethodEnum.POST })
    async getSMSCode(@Context() ctx: UserContext, @HTTPBody() params: SMSCodeRequest) {
        const { id, phone } = await ctx.service.web.sendSMSCode(params.phone)
        const data: SMSCodeResponse = { id, phone }
        ctx.service.res.success('Success to get SMS code', data)
    }

    @Middleware(shield(50))
    @HTTPMethod({ path: '/get-qr-code', method: HTTPMethodEnum.GET })
    async getQRCode(@Context() ctx: UserContext) {
        const res: getQRCodeResponse = await ctx.service.web.getQRCode()
        ctx.service.res.success('Success to get QR code', res)
    }

    // WX QR code login
    @Middleware()
    @HTTPMethod({ path: '/verify-qr-code', method: HTTPMethodEnum.GET })
    async verifyQRCode(@Context() ctx: UserContext, @HTTPQuery() token: string) {
        const res = await ctx.service.web.verifyQRCode(token)
        ctx.service.res.success('Success to get QR code', res)
    }

    // phone code login
    @Middleware(log(), transaction())
    @HTTPMethod({ path: '/login', method: HTTPMethodEnum.POST })
    async login(@Context() ctx: UserContext, @HTTPBody() params: LoginRequest) {
        const { phone, code, password, fid } = params

        const user = await ctx.service.web.login(phone, code, password, fid)
        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime.getTime(),
            phone: user.phone,
            chance: {
                level: user.level,
                levelExpiredAt: user.levelExpiredAt.getTime(),
                uploadSize: user.uploadSize,
                totalChatChance: user.chatChance + user.chatChanceFree,
                totalUploadChance: user.uploadChance + user.uploadChanceFree
            },
            benefit: await ctx.service.user.getLevelBenefit(user.level),
            models: await ctx.service.user.getLevelModel(user.level)
        }
        ctx.service.res.success('Success to login', data)
    }

    // get user info
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.GET })
    async userInfo(@Context() ctx: UserContext) {
        const { id } = ctx.user!

        await ctx.service.user.updateUserChance(id)
        const user = await ctx.service.user.getUserCache(id)
        if (!user) throw new Error('Can not find user cache')

        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime,
            phone: user.phone,
            chance: {
                level: user.level,
                levelExpiredAt: user.levelExpiredAt,
                uploadSize: user.uploadSize,
                totalChatChance: user.chatChance + user.chatChanceFree,
                totalUploadChance: user.uploadChance + user.uploadChanceFree
            },
            benefit: await ctx.service.user.getLevelBenefit(user.level),
            models: await ctx.service.user.getLevelModel(user.level)
        }
        ctx.service.res.success('User information', data)
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/update-user', method: HTTPMethodEnum.POST })
    async updateUser(@Context() ctx: UserContext, @HTTPBody() params: UpdateUserRequest) {
        const { id } = ctx.user!
        const { avatar, name, password } = params
        if (avatar) if (!$.isBase64(avatar, true)) throw new Error('Avatar base64 not valid')
        if (password) if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password)) throw new Error('Password not valid')

        const user = await ctx.service.web.updateUser(id, { avatar, name, password })
        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime.getTime(),
            phone: user.phone,
            chance: {
                level: user.level,
                levelExpiredAt: user.levelExpiredAt.getTime(),
                uploadSize: user.uploadSize,
                totalChatChance: user.chatChance + user.chatChanceFree,
                totalUploadChance: user.uploadChance + user.uploadChanceFree
            },
            benefit: await ctx.service.user.getLevelBenefit(user.level),
            models: await ctx.service.user.getLevelModel(user.level)
        }
        ctx.service.res.success('Success to update user info', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/list-dialog', method: HTTPMethodEnum.POST })
    async listDialog(@Context() ctx: UserContext, @HTTPBody() params: DialogListRequest) {
        const user = ctx.user!

        const res = await ctx.service.web.listDialog(user.id, params.id, params.lastId, params.pageSize)

        const data: DialogListResponse[] = res.map(({ id, title, updatedAt, createdAt }) => ({
            id,
            title,
            updatedAt,
            createdAt
        }))

        ctx.service.res.success('Success to list resources', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/list-chat', method: HTTPMethodEnum.POST })
    async listChat(@Context() ctx: UserContext, @HTTPBody() params: ChatListRequest) {
        const user = ctx.user!
        const { id, dialogId, lastId, pageSize } = params
        if (!dialogId) throw new Error('Dialog id is null')

        const res = await ctx.service.web.listChat(user.id, dialogId, id, lastId, pageSize)
        const data: ChatResponse[] = []
        for (const { id, dialogId, role, content, resourceId, model, subModel, isEffect, resource } of res)
            data.push({
                chatId: id,
                dialogId,
                avatar: role === ChatRoleEnum.USER ? user.avatar : await ctx.service.web.getConfig('DEFAULT_AVATAR_AI'),
                role,
                content,
                resourceId,
                model,
                subModel,
                isEffect,
                file: resource
                    ? {
                          name: resource.fileName,
                          ext: resource.fileExt,
                          size: resource.fileSize,
                          url: ctx.service.weChat.url(resource.filePath, resource.fileName)
                      }
                    : null
            })
        ctx.service.res.success('Success to list chat history', data)
    }

    // send chat message and set stream
    @Middleware(auth(), log())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: UserContext, @HTTPBody() params: ChatRequest) {
        const { id } = ctx.user!
        const { input, dialogId, provider, model, system, assistant, mode } = params
        if (!dialogId) throw new Error('Dialog id is null')
        if (!input) throw new Error('Input nothing')

        const res = await ctx.service.web.chat(dialogId, id, input, system, assistant, provider, model, mode)

        if (!(res instanceof Readable)) throw new Error('Response is not readable stream')
        ctx.service.res.success('Success to sse chat', res)
    }

    @Middleware(auth(), log(), transaction())
    @HTTPMethod({ path: '/del-dialog', method: HTTPMethodEnum.GET })
    async delDialog(@Context() ctx: UserContext, @HTTPQuery() id: string) {
        const user = ctx.user!
        if (!parseInt(id)) throw new Error('Dialog id is null')

        await ctx.service.web.delDialog(user.id, parseInt(id))
        ctx.service.res.success('Success to delete a dialog')
    }

    @Middleware(auth(), log(), transaction())
    @HTTPMethod({ path: '/add-dialog', method: HTTPMethodEnum.GET })
    async addDialog(@Context() ctx: UserContext) {
        const user = ctx.user!
        const { id, title, createdAt, updatedAt } = await ctx.service.web.addDialog(user.id)
        const data: DialogListResponse = { id, title, createdAt, updatedAt }
        ctx.service.res.success('Success to add a dialog', data)
    }

    @Middleware(auth(), log(), transaction())
    @HTTPMethod({ path: '/upload', method: HTTPMethodEnum.POST })
    async upload(@Context() ctx: UserContext, @HTTPBody() params: UploadRequest) {
        const user = ctx.user!
        const { dialogId } = params
        const file = ctx.request.files[0]
        if (!file) throw new Error('No file uploaded')
        if (!dialogId) throw new Error('Dialog id is null')

        const res = await ctx.service.web.upload(file, dialogId, user.id)
        const data: ChatResponse = {
            chatId: res.id,
            content: res.content,
            dialogId: res.dialogId,
            resourceId: res.resourceId,
            role: res.role,
            avatar: user.avatar,
            model: res.model,
            subModel: res.subModel,
            isEffect: res.isEffect,
            file: {
                name: res.resource!.fileName,
                ext: res.resource!.fileExt,
                size: res.resource!.fileSize,
                url: ctx.service.weChat.url(res.resource!.filePath, res.resource!.fileName)
            }
        }

        ctx.service.res.success('Success to upload a file', data)
    }
}
