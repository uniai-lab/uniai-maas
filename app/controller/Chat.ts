/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, HTTPBody, Middleware, Inject } from '@eggjs/tegg'
import { UserContext } from '@interface/Context'
import auth from 'app/middleware/auth'
import $ from '@util/util'
import { EggLoader } from 'egg'

@HTTPController({ path: '/chat' })
export default class Chat {
    @Inject()
    logger: EggLoader

    // app configs
    @HTTPMethod({ path: '/config', method: HTTPMethodEnum.POST })
    async config(@Context() ctx: UserContext) {
        try {
            const data = await ctx.service.user.getConfig()
            ctx.service.res.success('Config list', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // wechat login
    @HTTPMethod({ path: '/wx-login', method: HTTPMethodEnum.POST })
    async wxLogin(@Context() ctx: UserContext, @HTTPBody() params: WXSignInPost) {
        try {
            const res = await ctx.service.wechat.signIn(params.code)
            const data: UserWechatLoginResponseData = {
                id: res.id,
                wxOpenId: res.wxOpenId,
                wxUnionId: res.wxUnionId,
                token: res.token
            }
            ctx.service.res.success('Success to wechat login', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // wechat register
    @HTTPMethod({ path: '/wx-register', method: HTTPMethodEnum.POST })
    async wxRegister(@Context() ctx: UserContext, @HTTPBody() params: WXSignUpPost) {
        try {
            const { code, openid, iv, encryptedData } = params
            if (!code) throw new Error('Code can not be null')
            if (!openid) throw new Error('OpenID can not be null')
            if (!iv) throw new Error('IV can not be null')
            if (!encryptedData) throw new Error('EncryptedData can not be null')

            const res = await ctx.service.wechat.signUp(code, openid, iv, encryptedData)
            const user = res.user
            if (res.register) {
                await ctx.service.wechat.addDefaultResource(user.id)
                if (params.fid) await ctx.service.wechat.shareReward(params.fid)
            }

            const data: UserWechatRegisterResponseData = {
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
                    level: user.chance.level,
                    uploadSize: user.chance.uploadSize,
                    chatChance: user.chance.chatChance,
                    chatChanceUpdateAt: user.chance.chatChanceUpdateAt,
                    chatChanceFree: user.chance.chatChanceFree,
                    chatChanceFreeUpdateAt: user.chance.chatChanceFreeUpdateAt,
                    uploadChance: user.chance.uploadChance,
                    uploadChanceUpdateAt: user.chance.uploadChanceUpdateAt,
                    uploadFreeChance: user.chance.uploadChanceFree,
                    uploadChanceFreeUpdateAt: user.chance.uploadChanceFreeUpdateAt,
                    totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                    totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
                },
                fid: params.fid
            }
            ctx.service.res.success('Success to wechat register', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // get user info
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.POST })
    async userInfo(@Context() ctx: UserContext) {
        try {
            const userId = ctx.userId as number
            const res = await ctx.service.user.getUser(userId)
            if (!res) throw new Error('Fail to get user info')

            const task: Array<UserTask> = []
            const config = await ctx.service.user.getConfig()
            if (config.task)
                for (const item of config.task) {
                    let flag = true
                    if (res.wxPublicOpenId && item.type === 2) flag = false
                    task.push({ ...item, flag })
                }

            const data: UserinfoResponseData = {
                id: res.id,
                username: res.username,
                name: res.name,
                phone: res.phone,
                countryCode: res.countryCode,
                avatar: res.avatar,
                token: res.token,
                tokenTime: res.tokenTime,
                wxOpenId: res.wxOpenId,
                wxUnionId: res.wxUnionId,
                task,
                chance: {
                    level: res.chance.level,
                    uploadSize: res.chance.uploadSize,
                    chatChance: res.chance.chatChance,
                    chatChanceUpdateAt: res.chance.chatChanceUpdateAt,
                    chatChanceFree: res.chance.chatChanceFree,
                    chatChanceFreeUpdateAt: res.chance.chatChanceFreeUpdateAt,
                    uploadChance: res.chance.uploadChance,
                    uploadChanceUpdateAt: res.chance.uploadChanceUpdateAt,
                    uploadFreeChance: res.chance.uploadChanceFree,
                    uploadChanceFreeUpdateAt: res.chance.uploadChanceFreeUpdateAt,
                    totalChatChance: res.chance.chatChance + res.chance.chatChanceFree,
                    totalUploadChance: res.chance.uploadChance + res.chance.uploadChanceFree
                }
            }
            ctx.service.res.success('User information', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // send chat message
    @Middleware(auth())
    @HTTPMethod({ path: '/chat', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: UserContext, @HTTPBody() params: ChatPost) {
        try {
            const userId = ctx.userId as number
            if (!userId) throw new Error('No user id')
            const input = params.input.trim()
            if (!input) throw new Error('Input nothing')
            const dialogId = params.dialogId
            const model = params.model

            await ctx.service.chat.reduceChatChance(userId)
            const res = await ctx.service.chat.chat(input, userId, dialogId, false, model)

            if (!res) throw new Error('Fail to get sync response')
            const data: ChatResponseData = {
                type: false,
                content: await $.filterSensitive(res.content, ctx.__('Content contains non compliant information')),
                dialogId: res.dialogId,
                chatId: res.id,
                userId,
                avatar: process.env.DEFAULT_AVATAR_AI as string
            }
            ctx.service.res.success('Chat result', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.success('Chat error result', {
                type: false,
                content: (e as Error).message,
                avatar: process.env.DEFAULT_AVATAR_AI as string
            })
        }
    }

    // send chat message and set stream
    @Middleware(auth())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chatStream(@Context() ctx: UserContext, @HTTPBody() params: ChatPost) {
        try {
            const userId = ctx.userId as number
            if (!userId) throw new Error('No user id')
            const input = params.input.trim()
            if (!input) throw new Error('Input nothing')
            const dialogId = params.dialogId as number

            await ctx.service.chat.reduceChatChance(userId)
            await ctx.service.chat.chat(input, userId, dialogId, true)
            ctx.service.res.success('Success start chat stream', null)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // get chat stream
    @Middleware(auth())
    @HTTPMethod({ path: '/get-chat-stream', method: HTTPMethodEnum.POST })
    async getChatStream(@Context() ctx: UserContext) {
        try {
            const userId = ctx.userId as number
            const res = await ctx.service.chat.getChatStream(userId)

            if (!res) throw new Error('Chat not found or timeout')
            if (res.error) throw res.error

            const data: ChatStreamResponseData = {
                type: false,
                content: await $.filterSensitive(res.content, ctx.__('Content contains non compliant information')),
                userId: userId,
                dialogId: res.dialogId,
                avatar: process.env.DEFAULT_AVATAR_AI as string,
                chatId: res.chatId,
                end: res.end
            }
            ctx.service.res.success('Success get chat stream', data)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/list-chat', method: HTTPMethodEnum.POST })
    async listChat(@Context() ctx: UserContext, @HTTPBody() params: ChatListPost) {
        try {
            const userId = ctx.userId as number
            if (!userId) throw new Error('No user id')
            const dialogId = params.dialogId as number

            const res = await ctx.service.chat.listChat(userId, dialogId)
            if (!res) throw new Error('Dialog not found')
            const data: ChatResponseData[] = []
            for (const item of res.chats)
                data.push({
                    chatId: item.id,
                    type: item.role === 'user',
                    content: await $.filterSensitive(
                        item.content,
                        ctx.__('Content contains non compliant information')
                    ),
                    avatar:
                        item.role === 'user'
                            ? (process.env.DEFAULT_AVATAR_USER as string)
                            : (process.env.DEFAULT_AVATAR_AI as string),
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
            const userId = ctx.userId as number
            if (!userId) throw new Error('No user id')
            const file = ctx.request.files[0]
            if (!file) throw new Error('No file')
            const resourceTypeId = params.resourceTypeId
            if (!resourceTypeId) throw new Error('No resource type id')
            if (params.fileName) file.filename = params.fileName // use customize filename

            const res = await ctx.service.chat.upload(file, userId, resourceTypeId)
            const resource: UploadResponseData = {
                id: res.id,
                typeId: res.typeId,
                page: res.page,
                promptTokens: res.promptTokens,
                totalTokens: res.totalTokens,
                fileName: res.fileName,
                fileSize: res.fileSize,
                filePath: res.filePath,
                author: res.author,
                userId: res.userId,
                createdAt: res.createdAt,
                updatedAt: res.updatedAt
            }
            // create dialog
            const [dialog, created] = await ctx.service.chat.dialog(userId, res.id)
            await ctx.service.chat.reduceUploadChance(userId)

            ctx.service.res.success('success to upload', { resource, dialog, created })
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/list-dialog-resource', method: HTTPMethodEnum.POST })
    async listDialogResource(@Context() ctx: UserContext) {
        try {
            const userId = ctx.userId as number
            const res = await ctx.service.chat.listDialog(userId)
            const data: DialogResponseData[] = []
            for (const item of res)
                data.push({
                    dialogId: item.id,
                    resourceId: item.resource.id,
                    author: item.resource.author,
                    page: item.resource.page,
                    totalTokens: item.resource.totalTokens,
                    fileName: item.resource.fileName,
                    fileSize: item.resource.fileSize,
                    filePath: item.resource.filePath.replace('app', process.env.URL as string),
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

    /*
    @HTTPMethod({ path: '/get-code', method: HTTPMethodEnum.POST })
    async getCode(@Context() ctx: UserContext, @HTTPBody() params: SignInPost) {
        try {
            const res = await ctx.service.phone.getCode(params.phone)
            ctx.service.res.success('success to get sms code', res)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/sign-in', method: HTTPMethodEnum.POST })
    async signIn(@Context() ctx: UserContext, @HTTPBody() params: SignInPost) {
        try {
            const res = await ctx.service.phone.signIn(params.phone, params.code)
            ctx.service.res.success('success to sign in', res)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
    */
}
