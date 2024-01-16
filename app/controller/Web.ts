/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, HTTPBody, Middleware, HTTPQuery } from '@eggjs/tegg'
import { ChatRoleEnum } from '@interface/Enum'
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
    ConfigTask,
    TabResponse,
    UploadAvatarResponse,
    UpdateUserRequest,
    DialogRequest
} from '@interface/controller/WeChat'
import { basename, extname } from 'path'
import auth from '@middleware/authC'
import transaction from '@middleware/transaction'
import log from '@middleware/log'
import $ from '@util/util'
import validate from '@middleware/geetest'
import { SMSCodeRequest, SMSCodeResponse, LoginRequest } from '@interface/controller/Web'

@HTTPController({ path: '/web' })
export default class Web {
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
        name = name || basename(path)

        ctx.response.type = extname(name)
        ctx.set('Content-Disposition', `filename=${encodeURIComponent(name)}`) // 强制浏览器下载，设置下载的文件名

        ctx.body = await ctx.service.weChat.file(path)
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

    @Middleware(log(), validate())
    @HTTPMethod({ path: '/get-sms-code', method: HTTPMethodEnum.POST })
    async getSMSCode(@Context() ctx: UserContext, @HTTPBody() params: SMSCodeRequest) {
        const { id, phone } = await ctx.service.user.sendSMSCode(params.phone)
        const data: SMSCodeResponse = { id, phone }
        ctx.service.res.success('Success to WeChat login', data)
    }

    // WeChat login
    @Middleware(log(), transaction())
    @HTTPMethod({ path: '/login', method: HTTPMethodEnum.POST })
    async login(@Context() ctx: UserContext, @HTTPBody() params: LoginRequest) {
        const { phone, code } = params

        const user = await ctx.service.user.login(phone, code)

        ctx.service.res.success('Success to WeChat login', { user })
    }

    // get user info
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.GET })
    async userInfo(@Context() ctx: UserContext) {
        const user = ctx.user!

        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime,
            wxOpenId: user.wxOpenId,
            chance: {
                level: user.chance.level,
                uploadSize: user.chance.uploadSize,
                totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
            },
            task: await ctx.service.weChat.getConfig<ConfigTask[]>('USER_TASK'),
            benefit: await ctx.service.weChat.getLevelBenefit(user.chance.level)
        }
        ctx.service.res.success('User information', data)
    }

    // send chat message and set stream
    @Middleware(auth(), log())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: UserContext, @HTTPBody() params: ChatRequest) {
        const user = ctx.user!
        const { input, dialogId } = params
        if (!input) throw new Error('Input nothing')

        const res = await ctx.service.weChat.chat(input, user.id, dialogId)

        const data: ChatResponse = {
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
        for (const { id, role, content, resourceId, model, subModel, dialogId, isEffect } of res)
            data.push({
                chatId: id,
                role,
                content,
                resourceId,
                model,
                subModel,
                avatar:
                    role === ChatRoleEnum.USER
                        ? user.avatar || (await ctx.service.weChat.getConfig('DEFAULT_AVATAR_USER'))
                        : await ctx.service.weChat.getConfig('DEFAULT_AVATAR_AI'),
                dialogId,
                isEffect: isEffect
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
            fileName: $.contentFilter(res.fileName).text,
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

        const avatar = await ctx.service.weChat.uploadAvatar(file.filepath, user.id)
        const data: UploadAvatarResponse = { avatar }
        ctx.service.res.success('Success to upload avatar', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/update-user', method: HTTPMethodEnum.POST })
    async updateUser(@Context() ctx: UserContext, @HTTPBody() params: UpdateUserRequest) {
        const { id } = ctx.user!
        const user = await ctx.service.weChat.updateUser(id, params.name)

        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime,
            wxOpenId: user.wxOpenId,
            chance: {
                level: user.chance.level,
                uploadSize: user.chance.uploadSize,
                totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
            },
            task: await ctx.service.weChat.getConfig<ConfigTask[]>('USER_TASK'),
            benefit: await ctx.service.weChat.getLevelBenefit(user.chance.level)
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
        res.fileName = $.contentFilter(res.fileName).text
        const path = ctx.service.weChat.url(res.filePath, res.fileName)
        const data: ResourceResponse = {
            id: res.id,
            name: res.fileName,
            size: res.fileSize,
            ext: res.fileExt,
            path,
            pages: res.pages.map(v => ctx.service.weChat.url(v.filePath))
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
            if (!resource.isEffect) resource.filePath = await ctx.service.weChat.getConfig('WX_REVIEW_FILE')
            // filter file name
            resource.fileName = $.contentFilter(resource.fileName).text
            data.push({
                dialogId: id,
                resourceId: resource.id,
                page: resource.page,
                fileName: resource.fileName,
                fileSize: resource.fileSize,
                filePath: ctx.service.weChat.url(resource.filePath, resource.isEffect ? resource.fileName : ''),
                updatedAt: resource.updatedAt,
                typeId: resource.type.id,
                type: resource.type.type,
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
        await ctx.service.weChat.watchAdv(user.id)
        ctx.service.res.success('Success to get advertisement reward')
    }
}
