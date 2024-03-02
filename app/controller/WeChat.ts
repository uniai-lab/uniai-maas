/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, HTTPBody, Middleware, HTTPQuery } from '@eggjs/tegg'
import { UserContext } from '@interface/Context'
import {
    UploadResponse,
    UserinfoResponse,
    ChatListRequest,
    UploadRequest,
    DialogResponse,
    ChatRequest,
    ChatResponse,
    ResourceRequest,
    ResourceResponse,
    AnnounceResponse,
    ConfigResponse,
    TabResponse,
    UploadAvatarResponse,
    UpdateUserRequest,
    DialogRequest,
    LoginRequest
} from '@interface/controller/WeChat'
import auth from '@middleware/authC'
import transaction from '@middleware/transaction'
import log from '@middleware/log'
import { basename } from 'path'
import { statSync } from 'fs'
import { ChatRoleEnum } from 'uniai'
import { ConfigTask } from '@interface/Config'
import { Readable } from 'stream'
import captcha from '@middleware/captcha'
import { SMSCodeRequest, SMSCodeResponse } from '@interface/controller/Web'

@HTTPController({ path: '/wechat' })
export default class WeChat {
    // app configs
    @HTTPMethod({ path: '/config', method: HTTPMethodEnum.GET })
    async config(@Context() ctx: UserContext) {
        const data: ConfigResponse = await ctx.service.weChat.getUserConfig()
        ctx.service.res.success('Success to list config', data)
    }

    // app tabs
    @HTTPMethod({ path: '/tab', method: HTTPMethodEnum.GET })
    async tab(@Context() ctx: UserContext, @HTTPQuery() pid: string) {
        const res = await ctx.service.weChat.getTab(parseInt(pid))

        const data: TabResponse[] = []
        for (const { id, name, desc, pid } of res) {
            const child = res
                .filter(({ pid }) => pid === id)
                .map(({ id, name, desc, pid }) => ({ id, name, desc, pid }))
            data.push({ id, name, desc, pid, child })
        }
        ctx.service.res.success('Success to list tab', data)
    }

    @Middleware(log())
    @HTTPMethod({ path: '/file', method: HTTPMethodEnum.GET })
    async file(@Context() ctx: UserContext, @HTTPQuery() path: string, @HTTPQuery() name: string) {
        if (!path) throw new Error('Path is null')

        // file stream
        const data = await ctx.service.util.getFileStream(path)
        ctx.service.res.file(data, name || basename(path))
    }

    // announcement
    @HTTPMethod({ path: '/announce', method: HTTPMethodEnum.GET })
    async announce(@Context() ctx: UserContext) {
        const res = await ctx.service.weChat.announce()

        const data: AnnounceResponse[] = res.map(({ id, title, content, closeable }) => ({
            id,
            title,
            content,
            closeable
        }))

        ctx.service.res.success('Successfully list announcements', data)
    }

    // send code message on h5
    @Middleware(log(), captcha())
    @HTTPMethod({ path: '/get-sms-code', method: HTTPMethodEnum.POST })
    async getSMSCode(@Context() ctx: UserContext, @HTTPBody() params: SMSCodeRequest) {
        const { id, phone } = await ctx.service.web.sendSMSCode(params.phone)
        const data: SMSCodeResponse = { id, phone }
        ctx.service.res.success('Success to WeChat login', data)
    }

    // WeChat/Phone login
    @Middleware(log(), transaction())
    @HTTPMethod({ path: '/login', method: HTTPMethodEnum.POST })
    async login(@Context() ctx: UserContext, @HTTPBody() params: LoginRequest) {
        const { code, fid, phone, token } = params

        const user = await ctx.service.weChat.login(code, phone, fid)
        // if web use QRCode login
        if (token) await ctx.service.weChat.setQRCodeToken(token, user.id, user.token)

        const data: UserinfoResponse = {
            id: user.id,
            tokenTime: user.tokenTime.getTime(),
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            wxOpenId: user.wxOpenId,
            chance: {
                level: user.level,
                levelExpiredAt: user.levelExpiredAt.getTime(),
                uploadSize: user.uploadSize,
                totalChatChance: user.chatChance + user.chatChanceFree,
                totalUploadChance: user.uploadChance + user.uploadChanceFree
            },
            task: await ctx.service.weChat.getConfig<ConfigTask[]>('USER_TASK'),
            benefit: await ctx.service.user.getLevelBenefit(user.level)
        }
        ctx.service.res.success('Success to WeChat login', data)
    }

    /* wechat register, get phone number
    @HTTPMethod({ path: '/register', method: HTTPMethodEnum.POST })
    async register(@Context() ctx: UserContext, @HTTPBody() params: SignUpRequest) {
        try {
            const { code, openid, iv, encryptedData, fid } = params
            if (!code) throw new Error('Code can not be null')
            if (!openid) throw new Error('OpenID can not be null')
            if (!iv) throw new Error('IV can not be null')
            if (!encryptedData) throw new Error('EncryptedData can not be null')

            const { id, username, name, phone, countryCode, avatar, token, tokenTime, wxOpenId, wxUnionId, chance } =
                await ctx.service.weChat.signUp(code, openid, iv, encryptedData, fid)

            const data: UserinfoResponse = {
                id,
                username,
                name,
                phone,
                countryCode,
                avatar,
                token,
                tokenTime,
                wxOpenId,
                wxUnionId,
                chance: {
                    level: chance.level,
                    uploadSize: chance.uploadSize,
                    uploadChance: chance.uploadChance,
                    uploadChanceFree: chance.uploadChanceFree,
                    uploadChanceFreeUpdateAt: chance.uploadChanceFreeUpdateAt,
                    uploadChanceUpdateAt: chance.uploadChanceUpdateAt,
                    chatChance: chance.chatChance,
                    chatChanceFree: chance.chatChanceFree,
                    chatChanceFreeUpdateAt: chance.chatChanceFreeUpdateAt,
                    chatChanceUpdateAt: chance.chatChanceUpdateAt,
                    totalChatChance: chance.chatChance + chance.chatChanceFree,
                    totalUploadChance: chance.uploadChance + chance.uploadChanceFree
                },
                task: await ctx.service.weChat.getConfig<ConfigTask[]>('USER_TASK')
            }
            ctx.service.res.success('Success to WeChat register', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    */

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
            wxOpenId: user.wxOpenId,
            chance: {
                level: user.level,
                levelExpiredAt: user.levelExpiredAt,
                uploadSize: user.uploadSize,
                totalChatChance: user.chatChance + user.chatChanceFree,
                totalUploadChance: user.uploadChance + user.uploadChanceFree
            },
            task: await ctx.service.weChat.getConfig<ConfigTask[]>('USER_TASK'),
            benefit: await ctx.service.user.getLevelBenefit(user.level)
        }
        ctx.service.res.success('User information', data)
    }

    // send chat message and set/get stream
    @Middleware(auth(), log())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: UserContext, @HTTPBody() params: ChatRequest) {
        const user = ctx.user!
        const { input, dialogId, sse } = params
        if (!input) throw new Error('Input nothing')

        const res = await ctx.service.weChat.chat(input, user.id, dialogId, sse)
        const data: Readable | ChatResponse =
            res instanceof Readable
                ? res
                : {
                      chatId: res.id,
                      role: res.role,
                      content: res.isEffect ? res.content : ctx.__('not compliant'),
                      dialogId: res.dialogId,
                      resourceId: res.resourceId,
                      model: res.model,
                      subModel: res.subModel,
                      avatar: user.avatar || (await ctx.service.weChat.getConfig('DEFAULT_AVATAR_USER')),
                      isEffect: res.isEffect
                  }

        ctx.service.res.success('Success start chat stream', data)
    }

    // get chat stream
    @Middleware(auth())
    @HTTPMethod({ path: '/get-chat-stream', method: HTTPMethodEnum.GET })
    async getChat(@Context() ctx: UserContext) {
        const user = ctx.user!

        const res = await ctx.service.weChat.getChat(user.id)
        if (!res) return ctx.service.res.success('No chat stream', null)

        // filter sensitive
        const data: ChatResponse = {
            chatId: res.chatId,
            role: ChatRoleEnum.ASSISTANT,
            content: res.isEffect ? res.content : ctx.__('not compliant'),
            dialogId: res.dialogId,
            resourceId: res.resourceId,
            model: res.model,
            subModel: res.subModel,
            avatar: await ctx.service.weChat.getConfig('DEFAULT_AVATAR_AI'),
            isEffect: res.isEffect
        }
        ctx.service.res.success('Success to get chat stream', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/list-chat', method: HTTPMethodEnum.POST })
    async listChat(@Context() ctx: UserContext, @HTTPBody() params: ChatListRequest) {
        const user = ctx.user!
        const { dialogId, lastId, pageSize } = params

        const res = await ctx.service.weChat.listChat(user.id, dialogId, lastId, pageSize)
        const data: ChatResponse[] = []
        for (const { id, dialogId, role, content, resourceId, model, subModel, isEffect } of res)
            data.push({
                chatId: id,
                dialogId,
                avatar:
                    role === ChatRoleEnum.USER
                        ? user.avatar || (await ctx.service.weChat.getConfig('DEFAULT_AVATAR_USER'))
                        : await ctx.service.weChat.getConfig('DEFAULT_AVATAR_AI'),
                role,
                content,
                resourceId,
                model,
                subModel,
                isEffect
            })
        ctx.service.res.success('Success to list chat history', data)
    }

    @Middleware(auth(), log(), transaction())
    @HTTPMethod({ path: '/upload', method: HTTPMethodEnum.POST })
    async upload(@Context() ctx: UserContext, @HTTPBody() params: UploadRequest) {
        const user = ctx.user!
        const file = ctx.request.files[0]
        if (!file) throw new Error('No file')
        file.filename = params.fileName || file.filename

        const res = await ctx.service.weChat.upload(file, user.id, 1)
        const dialog = await ctx.service.weChat.addDialog(user.id, res.id)

        const data: UploadResponse = {
            id: res.id,
            dialogId: dialog.id,
            typeId: res.typeId,
            page: res.page,
            tokens: res.tokens,
            fileName: ctx.service.util.mintFilter(res.fileName).text,
            fileSize: res.fileSize,
            filePath: res.filePath,
            userId: res.userId,
            createdAt: res.createdAt,
            updatedAt: res.updatedAt
        }

        ctx.service.res.success('Success to upload', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/upload-avatar', method: HTTPMethodEnum.POST })
    async uploadAvatar(@Context() ctx: UserContext) {
        const user = ctx.user!
        const file = ctx.request.files[0]
        if (!file) throw new Error('No file')
        if (statSync(file.filepath).size > parseInt(await ctx.service.weChat.getConfig('LIMIT_UPLOAD_SIZE')))
            throw new Error('File size exceeds limit')

        const { id, avatar } = await ctx.service.weChat.updateUser(user.id, { avatar: file.filepath })
        const data: UploadAvatarResponse = { id, avatar }
        ctx.service.res.success('Success to upload avatar', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/update-user', method: HTTPMethodEnum.POST })
    async updateUser(@Context() ctx: UserContext, @HTTPBody() params: UpdateUserRequest) {
        const { id } = ctx.user!
        const user = await ctx.service.weChat.updateUser(id, { name: params.name })

        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime.getTime(),
            wxOpenId: user.wxOpenId,
            chance: {
                level: user.level,
                levelExpiredAt: user.levelExpiredAt.getTime(),
                uploadSize: user.uploadSize,
                totalChatChance: user.chatChance + user.chatChanceFree,
                totalUploadChance: user.uploadChance + user.uploadChanceFree
            },
            task: await ctx.service.weChat.getConfig<ConfigTask[]>('USER_TASK'),
            benefit: await ctx.service.user.getLevelBenefit(user.level)
        }
        ctx.service.res.success('Success to update user information', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/resource', method: HTTPMethodEnum.POST })
    async resource(@Context() ctx: UserContext, @HTTPBody() params: ResourceRequest) {
        const { id } = params
        if (!id) throw new Error('Resource ID is null')

        const res = await ctx.service.weChat.resource(id)

        // filter file name
        res.fileName = ctx.service.util.mintFilter(res.fileName).text
        const path = ctx.service.util.url(res.filePath, res.fileName)
        const data: ResourceResponse = {
            id: res.id,
            name: res.fileName,
            size: res.fileSize,
            ext: res.fileExt,
            path,
            pages: res.pages.map(v => ctx.service.util.url(v.filePath))
        }
        ctx.service.res.success('Success to get resource', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/list-dialog-resource', method: HTTPMethodEnum.POST })
    async listDialogResource(@Context() ctx: UserContext, @HTTPBody() params: DialogRequest) {
        const user = ctx.user!

        const res = await ctx.service.weChat.listDialog(user.id, params.lastId, params.pageSize)

        const data: DialogResponse[] = []
        for (const { id, resource } of res) {
            if (!resource) continue
            if (!resource.isEffect) resource.filePath = await ctx.service.weChat.getConfig('WX_REVIEW_FILE')
            // filter file name
            resource.fileName = ctx.service.util.mintFilter(resource.fileName).text
            data.push({
                dialogId: id,
                resourceId: resource.id,
                page: resource.page,
                fileName: resource.fileName,
                fileSize: resource.fileSize,
                filePath: ctx.service.util.url(resource.filePath, resource.isEffect ? resource.fileName : ''),
                updatedAt: resource.updatedAt,
                typeId: resource.type.id,
                type: resource.type.name,
                description: resource.type.description
            })
        }
        ctx.service.res.success('Success to list resources', data)
    }

    @Middleware(auth(), log(), transaction())
    @HTTPMethod({ path: '/del-dialog', method: HTTPMethodEnum.GET })
    async delDialog(@Context() ctx: UserContext, @HTTPQuery() id?: number) {
        const user = ctx.user!
        await ctx.service.weChat.delDialog(user.id, id)
        ctx.service.res.success('Success to delete a dialog')
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/watch-adv', method: HTTPMethodEnum.GET })
    async watchAdv(@Context() ctx: UserContext) {
        const user = ctx.user!
        const res = await ctx.service.weChat.watchAdv(user.id)
        ctx.service.res.success('Success to get advertisement reward', res)
    }
}
