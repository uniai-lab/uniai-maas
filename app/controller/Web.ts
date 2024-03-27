/** @format */

import {
    HTTPController,
    HTTPMethod,
    HTTPMethodEnum,
    Context,
    HTTPBody,
    Middleware,
    HTTPQuery,
    EggContext
} from '@eggjs/tegg'
import { Readable } from 'stream'
import { basename, extname } from 'path'
import { ChatRoleEnum } from 'uniai'
import auth from '@middleware/authC'
import transaction from '@middleware/transaction'
import log from '@middleware/log'
import captcha from '@middleware/captcha'
import shield from '@middleware/shield'
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
    ChatListRequest,
    ModelCostResponse
} from '@interface/controller/Web'
import { ResourceType } from '@interface/Enum'
import $ from '@util/util'

@HTTPController({ path: '/web' })
export default class Web {
    // app configs
    @HTTPMethod({ path: '/config', method: HTTPMethodEnum.GET })
    async config(@Context() ctx: EggContext) {
        const data = await ctx.service.web.getUserConfig()
        ctx.service.res.success('Success to list config', data)
    }

    // model cost list
    @HTTPMethod({ path: '/model-cost', method: HTTPMethodEnum.GET })
    async modelCost(@Context() ctx: EggContext) {
        const res = await ctx.service.uniAI.getChatModels()
        const data: ModelCostResponse[] = res.map(v => ({
            provider: v.provider,
            model: v.models.map(v => ({ model: v, chance: ctx.service.web.getModelChance(v) }))
        }))
        ctx.service.res.success('Success to list model cost', data)
    }

    @HTTPMethod({ path: '/file', method: HTTPMethodEnum.GET })
    async file(
        @Context() ctx: EggContext,
        @HTTPQuery() path: string,
        @HTTPQuery() name: string,
        @HTTPQuery() zip: string
    ) {
        name = name || basename(path)
        if (!path) throw new Error('Path is invalid')
        if (!name) throw new Error('Name is invalid')

        // get file stream
        const data = await ctx.service.util.getFileStream(path)
        const exts = ['png', 'jpg', 'jpeg', 'webp']

        // if zip, only compress image
        if (parseInt(zip) === 1 && exts.includes(extname(path).replace('.', '').toLowerCase()))
            return ctx.service.res.file(
                ctx.service.util.compressStreamImage(data),
                name.replace(extname(name), `.webp`)
            )

        return ctx.service.res.file(data, name)
    }

    @Middleware(log(), captcha())
    @HTTPMethod({ path: '/get-sms-code', method: HTTPMethodEnum.POST })
    async getSMSCode(@Context() ctx: EggContext, @HTTPBody() params: SMSCodeRequest) {
        const { id, phone } = await ctx.service.web.sendSMSCode(params.phone)
        const data: SMSCodeResponse = { id, phone }
        ctx.service.res.success('Success to get SMS code', data)
    }

    @Middleware(shield(50))
    @HTTPMethod({ path: '/get-qr-code', method: HTTPMethodEnum.GET })
    async getQRCode(@Context() ctx: EggContext) {
        const res: getQRCodeResponse = await ctx.service.web.getQRCode()
        ctx.service.res.success('Success to get QR code', res)
    }

    // WX QR code login
    @Middleware()
    @HTTPMethod({ path: '/verify-qr-code', method: HTTPMethodEnum.GET })
    async verifyQRCode(@Context() ctx: EggContext, @HTTPQuery() token: string) {
        const res = await ctx.service.web.verifyQRCode(token)
        ctx.service.res.success('Success to get QR code', res)
    }

    // phone code login
    @Middleware(log(), transaction())
    @HTTPMethod({ path: '/login', method: HTTPMethodEnum.POST })
    async login(@Context() ctx: EggContext, @HTTPBody() params: LoginRequest) {
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
            score: user.score,
            chance: {
                level: user.level,
                levelExpiredAt: user.levelExpiredAt.getTime(),
                uploadSize: user.uploadSize,
                totalChatChance: user.chatChance + user.chatChanceFree,
                totalUploadChance: user.uploadChance + user.uploadChanceFree
            },
            benefit: await ctx.service.user.getBenefit(user.id),
            models: await ctx.service.user.getModel(user.id)
        }
        ctx.service.res.success('Success to login', data)
    }

    // get user info
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.GET })
    async userInfo(@Context() ctx: EggContext) {
        const { id } = ctx.user!

        await ctx.service.user.updateFreeChance(id)
        await ctx.service.user.updateLevel(id)
        const user = await ctx.service.user.get(id)
        if (!user) throw new Error('Can not find user cache')

        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime,
            phone: user.phone,
            score: user.score,
            chance: {
                level: user.level,
                levelExpiredAt: user.levelExpiredAt,
                uploadSize: user.uploadSize,
                totalChatChance: user.chatChance + user.chatChanceFree,
                totalUploadChance: user.uploadChance + user.uploadChanceFree
            },
            benefit: await ctx.service.user.getBenefit(user.id),
            models: await ctx.service.user.getModel(user.id)
        }
        ctx.service.res.success('Success to get user information', data)
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/update-user', method: HTTPMethodEnum.POST })
    async updateUser(@Context() ctx: EggContext, @HTTPBody() params: UpdateUserRequest) {
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
            score: user.score,
            chance: {
                level: user.level,
                levelExpiredAt: user.levelExpiredAt.getTime(),
                uploadSize: user.uploadSize,
                totalChatChance: user.chatChance + user.chatChanceFree,
                totalUploadChance: user.uploadChance + user.uploadChanceFree
            },
            benefit: await ctx.service.user.getBenefit(user.id),
            models: await ctx.service.user.getModel(user.id)
        }
        ctx.service.res.success('Success to update user info', data)
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/list-dialog', method: HTTPMethodEnum.POST })
    async listDialog(@Context() ctx: EggContext, @HTTPBody() params: DialogListRequest) {
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
    async listChat(@Context() ctx: EggContext, @HTTPBody() params: ChatListRequest) {
        const user = ctx.user!
        const { id, dialogId, lastId, pageSize } = params
        if (!dialogId) throw new Error('Dialog id is null')

        const res = await ctx.service.web.listChat(user.id, dialogId, id, lastId, pageSize)
        const data: ChatResponse[] = []
        for (const item of res)
            data.push({
                chatId: item.id,
                userId: user.id,
                dialogId,
                avatar:
                    item.role === ChatRoleEnum.USER
                        ? user.avatar
                        : await ctx.service.web.getConfig('DEFAULT_AVATAR_AI'),
                role: item.role,
                content: item.content,
                resourceId: item.resourceId,
                model: item.model,
                subModel: item.subModel,
                isEffect: item.isEffect,
                file: item.resource
                    ? {
                          name: item.resourceName || item.resource.fileName,
                          ext: (item.resource.typeId === ResourceType.IMAGE ? 'image/' : '') + item.resource.fileExt,
                          size: item.resource.fileSize,
                          url: ctx.service.util.fileURL(
                              item.resource.filePath,
                              item.resourceName || item.resource.fileName
                          )
                      }
                    : null
            })
        ctx.service.res.success('Success to list chat history', data)
    }

    // send chat message and set stream
    @Middleware(auth(), log())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: EggContext, @HTTPBody() params: ChatRequest) {
        const { id, level } = ctx.user!
        const { input, dialogId, provider, model, system, assistant, mode } = params
        if (!dialogId) throw new Error('Dialog id is null')
        if (!input.trim()) throw new Error('Input nothing')

        // check user level access provider/model
        const disable = await ctx.service.user.checkLevelModel(level, provider)
        if (disable) throw new Error('Level no access to the provider model')

        const res = await ctx.service.web.chat(dialogId, id, input, system, assistant, provider, model, mode)

        if (!(res instanceof Readable)) throw new Error('Response is not readable stream')
        ctx.service.res.success('Success to sse chat', res)
    }

    @Middleware(auth(), log(), transaction())
    @HTTPMethod({ path: '/del-dialog', method: HTTPMethodEnum.GET })
    async delDialog(@Context() ctx: EggContext, @HTTPQuery() id: string) {
        const user = ctx.user!
        if (!parseInt(id)) throw new Error('Dialog id is null')

        await ctx.service.web.delDialog(user.id, parseInt(id))
        ctx.service.res.success('Success to delete a dialog')
    }

    @Middleware(auth(), log())
    @HTTPMethod({ path: '/add-dialog', method: HTTPMethodEnum.GET })
    async addDialog(@Context() ctx: EggContext) {
        const { id, title, createdAt, updatedAt } = await ctx.service.web.addDialog(ctx.user!.id)
        const data: DialogListResponse = { id, title, createdAt, updatedAt }
        ctx.service.res.success('Success to add a dialog', data)
    }

    @Middleware(auth(), log(), transaction())
    @HTTPMethod({ path: '/upload', method: HTTPMethodEnum.POST })
    async upload(@Context() ctx: EggContext, @HTTPBody() params: UploadRequest) {
        const user = ctx.user!
        const { dialogId } = params
        const file = ctx.request.files[0]
        if (!file) throw new Error('No file uploaded')
        if (!dialogId) throw new Error('Dialog id is null')

        const res = await ctx.service.web.upload(file, dialogId, user.id)
        const data: ChatResponse = {
            chatId: res.id,
            userId: user.id,
            dialogId: res.dialogId,
            content: res.content,
            resourceId: res.resourceId,
            role: res.role,
            avatar: user.avatar,
            model: res.model,
            subModel: res.subModel,
            isEffect: res.isEffect,
            file: {
                name: res.resourceName || res.resource!.fileName,
                ext: (res.resource!.typeId === ResourceType.IMAGE ? 'image/' : '') + res.resource!.fileExt,
                size: res.resource!.fileSize,
                url: ctx.service.util.fileURL(res.resource!.filePath, res.resourceName || res.resource!.fileName)
            }
        }

        ctx.service.res.success('Success to upload a file', data)
    }
}
