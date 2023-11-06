/** @format */

import {
    HTTPController,
    HTTPMethod,
    HTTPMethodEnum,
    HTTPBody,
    Context,
    EggContext,
    Middleware,
    Inject
} from '@eggjs/tegg'
import { AddFollowRewardRequest, UpdateUserRequest, UploadRequest, UploadResponse } from '@interface/controller/Admin'
import { authAdmin } from '@middleware/auth'
import { EggLogger } from 'egg'

@HTTPController({ path: '/admin' })
export default class Admin {
    @Inject()
    logger: EggLogger

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/add-resource', method: HTTPMethodEnum.POST })
    async updateResource(@Context() ctx: EggContext, @HTTPBody() params: UploadRequest) {
        try {
            const file = ctx.request.files[0]
            if (!file) throw new Error('No file')
            const { typeId, filename, userId, init, model, resourceId } = params
            file.filename = filename || file.filename // use customize filename

            // upload resource
            const upload = await ctx.service.uniAI.upload(file)
            // embedding resource
            const res = await ctx.service.uniAI.embedding(
                model,
                resourceId,
                upload.content,
                upload.fileName,
                upload.filePath,
                upload.fileSize,
                userId,
                typeId
            )

            const resource: UploadResponse = {
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
            if (init) await ctx.model.Config.upsert({ key: 'INIT_RESOURCE_ID', value: res.id })

            ctx.service.res.success('success to upload', { resource })
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/add-follow-reward', method: HTTPMethodEnum.POST })
    async addFollowReward(@Context() ctx: EggContext, @HTTPBody() params: AddFollowRewardRequest) {
        try {
            if (!params.unionId) throw new Error('No user union ID')
            if (!params.openId) throw new Error('No public account user open ID')

            const res = await ctx.service.wechat.followReward(params.unionId, params.openId)
            ctx.service.res.success('Success add user follow reward', res)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/save-user', method: HTTPMethodEnum.POST })
    async saveUser(@Context() ctx: EggContext, @HTTPBody() params: UpdateUserRequest) {
        try {
            const { username, password } = params
            if (!username) throw new Error('No username')
            if (!password) throw new Error('No password')
            // add user
            const res = await ctx.service.admin.updateUser(params)
            ctx.service.res.success(res.flag ? 'Success add user' : 'Success save user', res.user)
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
