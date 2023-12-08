/** @format */

import { EggLogger } from 'egg'
import {
    HTTPController,
    HTTPMethod,
    HTTPMethodEnum,
    Context,
    HTTPBody,
    Middleware,
    Inject,
    HTTPQuery
} from '@eggjs/tegg'
import auth from '@middleware/auth'
import { ChatRoleEnum } from '@interface/Enum'
import { UserContext } from '@interface/Context'
import {
    SignInRequest,
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
    UpdateUserRequest
} from '@interface/controller/WeChat'
import { extname } from 'path'
import { UserCache } from '@interface/Cache'

@HTTPController({ path: '/wechat' })
export default class WeChat {
    @Inject()
    logger: EggLogger

    // app configs
    @HTTPMethod({ path: '/config', method: HTTPMethodEnum.GET })
    async config(@Context() ctx: UserContext) {
        try {
            const data: ConfigResponse = await ctx.service.weChat.getUserConfig()
            ctx.service.res.success('Success to list config', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // app tabs
    @HTTPMethod({ path: '/tab', method: HTTPMethodEnum.GET })
    async tab(@Context() ctx: UserContext, @HTTPQuery() pid?: number) {
        try {
            const res = await ctx.service.weChat.getTab(pid)

            const data: TabResponse[] = []
            for (const { id, name, desc, pid } of res)
                data.push({
                    id,
                    name,
                    desc,
                    pid,
                    child: res
                        .filter(({ pid }) => pid === id)
                        .map<TabResponse>(({ id, name, desc, pid }) => {
                            return { id, name, desc, pid }
                        })
                })

            ctx.service.res.success('Success to list tab', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // announcement
    @HTTPMethod({ path: '/announce', method: HTTPMethodEnum.GET })
    async announce(@Context() ctx: UserContext) {
        try {
            const res = await ctx.service.weChat.announce()

            // 从响应中提取所需的数据，并映射到 AnnounceResponse 数组
            const data = res.map(({ title, content, closeable }) => ({
                title,
                content,
                closeable
            })) as AnnounceResponse[]

            // 成功响应
            ctx.service.res.success('Successfully listed announcements', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // wechat login
    @HTTPMethod({ path: '/login', method: HTTPMethodEnum.POST })
    async login(@Context() ctx: UserContext, @HTTPBody() params: SignInRequest) {
        try {
            const { code, fid } = params
            if (!code) throw new Error('Code is null')

            const user = await ctx.service.weChat.signIn(code, fid)
            const data: UserinfoResponse = {
                id: user.id,
                name: user.name || '',
                avatar: user.avatar || (await ctx.service.weChat.getConfig('DEFAULT_AVATAR_USER')),
                username: user.username || '',
                token: user.token || '',
                tokenTime: user.tokenTime,
                wxOpenId: user.wxOpenId || '',
                chance: {
                    level: user.chance.level,
                    uploadSize: user.chance.uploadSize,
                    totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                    totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
                },
                task: await ctx.service.weChat.getConfig<ConfigTask[]>('USER_TASK')
            }
            ctx.service.res.success('Success to WeChat login', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
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
        try {
            const user = ctx.user as UserCache

            const data: UserinfoResponse = {
                id: user.id,
                name: user.name || '',
                avatar: user.avatar || (await ctx.service.weChat.getConfig('DEFAULT_AVATAR_USER')),
                username: user.username || '',
                token: user.token || '',
                tokenTime: user.tokenTime,
                wxOpenId: user.wxOpenId || '',
                chance: {
                    level: user.chance.level,
                    uploadSize: user.chance.uploadSize,
                    totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                    totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
                },
                task: await ctx.service.weChat.getConfig<ConfigTask[]>('USER_TASK')
            }
            ctx.service.res.success('User information', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // send chat message and set stream
    @Middleware(auth())
    @HTTPMethod({ path: '/chat-stream', method: HTTPMethodEnum.POST })
    async chat(@Context() ctx: UserContext, @HTTPBody() params: ChatRequest) {
        try {
            const user = ctx.user as UserCache
            const { input, dialogId } = params
            if (!input) throw new Error('Input nothing')

            const res = await ctx.service.weChat.chat(input, user.id, dialogId)
            const data: ChatResponse = {
                chatId: res.id,
                type: true,
                role: res.role,
                model: res.model,
                resourceId: res.resourceId,
                content: res.content,
                userId: user.id,
                dialogId: res.dialogId,
                avatar: user.avatar || (await ctx.service.weChat.getConfig('DEFAULT_AVATAR_USER'))
            }

            ctx.service.res.success('Success start chat stream', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    // get chat stream
    @Middleware(auth())
    @HTTPMethod({ path: '/get-chat-stream', method: HTTPMethodEnum.GET })
    async getChat(@Context() ctx: UserContext) {
        try {
            const user = ctx.user as UserCache

            const res = await ctx.service.weChat.getChat(user.id)
            if (!res) return ctx.service.res.success('No chat stream', null)

            // filter sensitive
            const data: ChatResponse = {
                chatId: res.chatId,
                type: false,
                role: ChatRoleEnum.ASSISTANT,
                content: res.content,
                userId: user.id,
                dialogId: res.dialogId,
                resourceId: res.resourceId,
                model: res.model,
                avatar: await ctx.service.weChat.getConfig('DEFAULT_AVATAR_AI')
            }
            ctx.service.res.success('Get chat stream', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/list-chat', method: HTTPMethodEnum.POST })
    async listChat(@Context() ctx: UserContext, @HTTPBody() params: ChatListRequest) {
        try {
            const user = ctx.user as UserCache

            const res = await ctx.service.weChat.listChat(user.id, params.dialogId)
            const data: ChatResponse[] = []
            for (const item of res.chats)
                data.push({
                    chatId: item.id,
                    role: item.role,
                    type: item.role === ChatRoleEnum.USER,
                    content: item.content,
                    resourceId: item.resourceId,
                    model: item.model,
                    avatar:
                        item.role === ChatRoleEnum.USER
                            ? user.avatar || (await ctx.service.weChat.getConfig('DEFAULT_AVATAR_USER'))
                            : await ctx.service.weChat.getConfig('DEFAULT_AVATAR_AI'),
                    dialogId: res.id,
                    userId: res.userId
                })
            ctx.service.res.success('Chat result', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/upload', method: HTTPMethodEnum.POST })
    async upload(@Context() ctx: UserContext, @HTTPBody() params: UploadRequest) {
        try {
            const user = ctx.user as UserCache
            const file = ctx.request.files[0]
            if (!file) throw new Error('No file')
            file.filename = params.fileName || file.filename

            const res = await ctx.service.weChat.upload(file, user.id, 1)
            const dialog = await ctx.service.weChat.dialog(user.id, res.id)

            const data: UploadResponse = {
                id: res.id,
                dialogId: dialog.id,
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

            ctx.service.res.success('Success to upload', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/upload-avatar', method: HTTPMethodEnum.POST })
    async uploadAvatar(@Context() ctx: UserContext) {
        try {
            const user = ctx.user as UserCache
            const file = ctx.request.files[0]
            if (!file) throw new Error('No file')

            const avatar = await ctx.service.weChat.uploadAvatar(file.filepath, user.id)
            const data: UploadAvatarResponse = { avatar }
            ctx.service.res.success('Success to upload avatar', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/update-user', method: HTTPMethodEnum.POST })
    async updateUser(@Context() ctx: UserContext, @HTTPBody() params: UpdateUserRequest) {
        try {
            const { id } = ctx.user as UserCache
            const user = await ctx.service.weChat.updateUser(id, params.name)
            const data: UserinfoResponse = {
                id: user.id,
                name: user.name || '',
                avatar: user.avatar || (await ctx.service.weChat.getConfig('DEFAULT_AVATAR_USER')),
                username: user.username || '',
                token: user.token || '',
                tokenTime: user.tokenTime,
                wxOpenId: user.wxOpenId || '',
                chance: {
                    level: user.chance.level,
                    uploadSize: user.chance.uploadSize,
                    totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                    totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
                },
                task: await ctx.service.weChat.getConfig<ConfigTask[]>('USER_TASK')
            }
            ctx.service.res.success('Success to update user information', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/resource', method: HTTPMethodEnum.POST })
    async resource(@Context() ctx: UserContext, @HTTPBody() params: ResourceRequest) {
        try {
            const { id } = params
            if (!id) throw new Error('Resource ID is null')

            const res = await ctx.service.weChat.resource(id)
            const path = ctx.service.weChat.url(res.filePath, res.fileName)
            const data: ResourceResponse = {
                id: res.id,
                name: res.fileName,
                size: res.fileSize,
                ext: res.fileExt,
                path,
                pages: res.pages.map(v => ctx.service.weChat.url(v.filePath))
            }
            ctx.service.res.success('Success get resource', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @HTTPMethod({ path: '/file', method: HTTPMethodEnum.GET })
    async file(@Context() ctx: UserContext, @HTTPQuery() path: string, @HTTPQuery() name?: string) {
        try {
            if (!path) throw new Error('Path is null')

            const res = await ctx.service.weChat.file(path)
            name = name || res.name

            ctx.response.type = extname(name)
            ctx.set('Content-Disposition', `filename=${encodeURIComponent(name)}`) // 强制浏览器下载，设置下载的文件名

            ctx.body = res.file
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(auth())
    @HTTPMethod({ path: '/list-dialog-resource', method: HTTPMethodEnum.GET })
    async listDialogResource(@Context() ctx: UserContext) {
        try {
            const user = ctx.user as UserCache

            const res = await ctx.service.weChat.listDialog(user.id)

            const data: DialogResponse[] = []
            for (const { id, resource } of res)
                data.push({
                    dialogId: id,
                    resourceId: resource.id,
                    page: resource.page,
                    totalTokens: resource.tokens,
                    fileName: resource.fileName,
                    fileSize: resource.fileSize,
                    fileExt: resource.fileExt,
                    filePath: ctx.service.weChat.url(resource.filePath, resource.fileName),
                    updatedAt: resource.updatedAt,
                    typeId: resource.type.id,
                    type: resource.type.type,
                    description: resource.type.description
                })
            ctx.service.res.success('Success to list resources', data)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
