/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, HTTPBody, Middleware, Inject } from '@eggjs/tegg'
import { UserContext } from '@interface/Context'
import auth from 'app/middleware/auth'
import { EggLoader } from 'egg'

@HTTPController({ path: '/wechat' })
export default class WeChat {
    @Inject()
    logger: EggLoader

    // app configs
    @HTTPMethod({ path: '/config', method: HTTPMethodEnum.GET })
    async config(@Context() ctx: UserContext) {
        try {
            ctx.service.res.success('Success to list config', await ctx.service.user.getConfig())
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // wechat login
    @HTTPMethod({ path: '/login', method: HTTPMethodEnum.POST })
    async login(@Context() ctx: UserContext, @HTTPBody() params: WXSignInPost) {
        try {
            const { code, fid } = params
            if (!code) throw new Error('Code is null')

            const user = await ctx.service.weChat.signIn(code, fid)
            const data: UserinfoResponseData = {
                id: user.id,
                username: user.username,
                name: user.name,
                phone: user.phone,
                countryCode: user.countryCode,
                avatar: user.avatar,
                token: user.token,
                tokenTime: user.tokenTime,
                wxOpenId: user.wxOpenId,
                wxUnionId: user.wxUnionId,
                chance: {
                    ...user.chance.dataValues,
                    totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                    totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
                }
            }
            ctx.service.res.success('Success to WeChat login', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // wechat register, get phone number
    @HTTPMethod({ path: '/register', method: HTTPMethodEnum.POST })
    async register(@Context() ctx: UserContext, @HTTPBody() params: WXSignUpPost) {
        try {
            const { code, openid, iv, encryptedData, fid } = params
            if (!code) throw new Error('Code can not be null')
            if (!openid) throw new Error('OpenID can not be null')
            if (!iv) throw new Error('IV can not be null')
            if (!encryptedData) throw new Error('EncryptedData can not be null')

            const user = await ctx.service.weChat.signUp(code, openid, iv, encryptedData, fid)

            const data: UserinfoResponseData = {
                id: user.id,
                username: user.username,
                name: user.name,
                phone: user.phone,
                countryCode: user.countryCode,
                avatar: user.avatar,
                token: user.token,
                tokenTime: user.tokenTime,
                wxOpenId: user.wxOpenId,
                wxUnionId: user.wxUnionId,
                chance: {
                    ...user.chance.dataValues,
                    totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                    totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
                },
                fid: params.fid
            }
            ctx.service.res.success('Success to WeChat register', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // get user info
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.GET })
    async userInfo(@Context() ctx: UserContext) {
        try {
            const userId = ctx.userId
            if (!userId) throw new Error('No user id')
            const { user, config } = await ctx.service.weChat.getUserResetChance(userId)

            const task: Array<UserTask> = []
            if (config.task)
                for (const item of config.task) {
                    let flag = true
                    if (user.wxPublicOpenId && item.type === 2) flag = false
                    task.push({ ...item, flag })
                }

            const data: UserinfoResponseData = {
                id: user.id,
                username: user.username,
                name: user.name,
                phone: user.phone,
                countryCode: user.countryCode,
                avatar: user.avatar,
                token: user.token,
                tokenTime: user.tokenTime,
                wxOpenId: user.wxOpenId,
                wxUnionId: user.wxUnionId,
                task,
                chance: {
                    ...user.chance.dataValues,
                    totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                    totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
                }
            }
            ctx.service.res.success('User information', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // send chat message and set stream
    @Middleware(auth())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: UserContext, @HTTPBody() params: ChatPost) {
        try {
            const userId = ctx.userId
            if (!userId) throw new Error('No user id')
            const { input, dialogId, model } = params
            if (!input) throw new Error('Input nothing')

            const res = await ctx.service.weChat.chat(input, userId, dialogId, model)
            const data: ChatResponseData = {
                type: true,
                content: res.content,
                userId,
                dialogId: res.dialogId,
                chatId: res.id,
                avatar: process.env.DEFAULT_AVATAR_USER
            }

            ctx.service.res.success('Success start chat stream', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // get chat stream
    @Middleware(auth())
    @HTTPMethod({ path: '/get-chat-stream', method: HTTPMethodEnum.GET })
    async getChat(@Context() ctx: UserContext) {
        try {
            const userId = ctx.userId
            if (!userId) throw new Error('No user id')
            const res = await ctx.service.weChat.getChat(userId)
            if (!res) return ctx.service.res.success('No chat stream', null)
            // filter sensitive
            const content = res.content // $.filterSensitive(res.content, ctx.__('non compliant information'))
            const data: ChatResponseData = {
                type: false,
                content,
                userId,
                dialogId: res.dialogId,
                chatId: res.chatId,
                avatar: process.env.DEFAULT_AVATAR_AI
            }
            ctx.service.res.success('Get chat stream', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/list-chat', method: HTTPMethodEnum.POST })
    async listChat(@Context() ctx: UserContext, @HTTPBody() params: ChatListPost) {
        try {
            const userId = ctx.userId
            if (!userId) throw new Error('No user id')
            const dialogId = params.dialogId

            const res = await ctx.service.weChat.listChat(userId, dialogId)
            if (!res) throw new Error('Dialog not found')
            const data: ChatResponseData[] = []
            for (const item of res.chats)
                data.push({
                    chatId: item.id,
                    type: item.role === 'user',
                    content: item.content, // $.filterSensitive(item.content, ctx.__('non compliant information')),
                    avatar: item.role === 'user' ? process.env.DEFAULT_AVATAR_USER : process.env.DEFAULT_AVATAR_AI,
                    dialogId: res.id,
                    userId: res.userId
                })
            ctx.service.res.success('Chat result', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/upload', method: HTTPMethodEnum.POST })
    async upload(@Context() ctx: UserContext, @HTTPBody() params: ResourceUploadPost) {
        try {
            const userId = ctx.userId
            if (!userId) throw new Error('No user id')
            const file = ctx.request.files[0]
            if (!file) throw new Error('No file')
            const typeId = params.typeId
            if (!typeId) throw new Error('No resource type id')
            if (params.fileName) file.filename = params.fileName // use customize filename

            const res = await ctx.service.weChat.upload(file, userId, typeId)
            const resource: UploadResponseData = {
                id: res.id,
                typeId: res.typeId,
                page: res.page,
                tokens: res.tokens,
                fileName: res.fileName,
                fileSize: res.fileSize,
                filePath: res.filePath,
                userId: res.userId,
                createdAt: res.createdAt,
                updatedAt: res.updatedAt
            }
            // create dialog
            const dialog = await ctx.service.weChat.dialog(userId, res.id)
            await ctx.service.weChat.reduceUploadChance(userId)

            ctx.service.res.success('success to upload', { resource, dialog })
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/list-dialog-resource', method: HTTPMethodEnum.GET })
    async listDialogResource(@Context() ctx: UserContext) {
        try {
            const userId = ctx.userId
            if (!userId) throw new Error('No user id')
            const res = await ctx.service.weChat.listDialog(userId)
            const data: DialogResponseData[] = []
            for (const item of res)
                data.push({
                    dialogId: item.id,
                    resourceId: item.resource.id,
                    page: item.resource.page,
                    totalTokens: item.resource.tokens,
                    fileName: item.resource.fileName,
                    fileSize: item.resource.fileSize,
                    filePath: item.resource.filePath,
                    updatedAt: item.resource.updatedAt,
                    typeId: item.resource.typeId,
                    typeName: item.resource.type.type,
                    typeDesc: item.resource.type.description
                })
            ctx.service.res.success('success to list resources', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
