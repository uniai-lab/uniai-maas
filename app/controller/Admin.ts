/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPBody, Context, EggContext, Middleware } from '@eggjs/tegg'
import { authAdmin } from '@middleware/auth'

@HTTPController({ path: '/admin' })
export default class Admin {
    @Middleware(authAdmin())
    @HTTPMethod({ path: '/add-resource', method: HTTPMethodEnum.POST })
    async updateResource(@Context() ctx: EggContext, @HTTPBody() params: AdminUpdateResourcePost) {
        try {
            const file = ctx.request.files[0]
            if (!file) throw new Error('No file')
            const resourceTypeId = params.resourceTypeId
            if (!resourceTypeId) throw new Error('No resource type id')
            if (params.fileName) file.filename = params.fileName // use customize filename

            const res = await ctx.service.chat.upload(file, 0, resourceTypeId)
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

            ctx.service.res.success('success to upload', { resource })
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/add-follow-reward', method: HTTPMethodEnum.POST })
    async addFollowReward(@Context() ctx: EggContext, @HTTPBody() params: AdminAddFollowRewardPost) {
        try {
            if (!params.unionId) throw new Error('No user union ID')
            if (!params.openId) throw new Error('No public account user open ID')

            const res = await ctx.service.wechat.followReward(params.unionId, params.openId)
            ctx.service.res.success('Success add user follow reward', res)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/save-user', method: HTTPMethodEnum.POST })
    async saveUser(@Context() ctx: EggContext, @HTTPBody() params: AdminUpdateUserPost) {
        try {
            if (!params.username) throw new Error('No username')
            if (!params.password) throw new Error('No password')
            // add user
            const res = await ctx.service.admin.updateUser(params)
            ctx.service.res.success(res.flag ? 'Success add user' : 'Success save user', res.user)
        } catch (e) {
            console.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}