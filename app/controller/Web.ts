/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, HTTPBody, Middleware, HTTPQuery } from '@eggjs/tegg'
import { UserContext } from '@interface/Context'
import auth from '@middleware/authC'
import transaction from '@middleware/transaction'
import log from '@middleware/log'
import captcha from '@middleware/captcha'
import {
    SMSCodeRequest,
    SMSCodeResponse,
    LoginRequest,
    UserinfoResponse,
    ConfigResponse
} from '@interface/controller/Web'
import {
    AnnounceResponse,
    ChatListRequest,
    ChatRequest,
    ChatResponse,
    DialogRequest,
    DialogResponse,
    TabResponse
} from '@interface/controller/WeChat'
import $ from '@util/util'
import { ChatRoleEnum } from '@interface/Enum'

@HTTPController({ path: '/web' })
export default class Web {
    // app configs
    @HTTPMethod({ path: '/config', method: HTTPMethodEnum.GET })
    async config(@Context() ctx: UserContext) {
        const data: ConfigResponse = await ctx.service.web.getUserConfig()
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

    @HTTPMethod({ path: '/file', method: HTTPMethodEnum.GET })
    async file(@Context() ctx: UserContext, @HTTPQuery() path: string, @HTTPQuery() name: string) {
        if (!path) throw new Error('Path is null')

        // file stream
        ctx.body = await ctx.service.uniAI.file(path, name)
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

    @Middleware(log(), captcha())
    @HTTPMethod({ path: '/get-sms-code', method: HTTPMethodEnum.POST })
    async getSMSCode(@Context() ctx: UserContext, @HTTPBody() params: SMSCodeRequest) {
        const { id, phone } = await ctx.service.web.sendSMSCode(params.phone)
        const data: SMSCodeResponse = { id, phone }
        ctx.service.res.success('Success to WeChat login', data)
    }

    // WeChat login
    @Middleware(log(), transaction())
    @HTTPMethod({ path: '/login', method: HTTPMethodEnum.POST })
    async login(@Context() ctx: UserContext, @HTTPBody() params: LoginRequest) {
        const { phone, code, fid } = params

        const user = await ctx.service.web.login(phone, code, fid)
        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime,
            phone: user.phone,
            chance: {
                level: user.chance.level,
                uploadSize: user.chance.uploadSize,
                totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
            },
            benefit: await ctx.service.user.getLevelBenefit(user.chance.level)
        }
        ctx.service.res.success('Success to WeChat login', data)
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
            phone: user.phone,
            chance: {
                level: user.chance.level,
                uploadSize: user.chance.uploadSize,
                totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
            },
            benefit: await ctx.service.user.getLevelBenefit(user.chance.level)
        }
        ctx.service.res.success('User information', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/list-dialog', method: HTTPMethodEnum.POST })
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
}
