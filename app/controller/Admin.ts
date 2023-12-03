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
import { AddFollowRewardRequest, UpdateUserRequest } from '@interface/controller/Admin'
import { authAdmin } from '@middleware/auth'
import { EggLogger } from 'egg'
import config from '@data/config'
import resourceType from '@data/resourceType'

@HTTPController({ path: '/admin' })
export default class Admin {
    @Inject()
    logger: EggLogger

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

    @Middleware(authAdmin())
    @HTTPMethod({ path: '/init', method: HTTPMethodEnum.GET })
    async initData(@Context() ctx: EggContext) {
        try {
            // update database (structure), initial data
            await ctx.model.query('CREATE EXTENSION if not exists vector')
            await ctx.model.sync({ force: false, alter: true })

            const configs = await ctx.model.Config.bulkCreate(config, { updateOnDuplicate: ['value', 'description'] })
            const resourceTypes = await ctx.model.ResourceType.bulkCreate(resourceType, {
                updateOnDuplicate: ['description']
            })

            // update redis cache, set config
            for (const item of configs) await ctx.app.redis.set(item.key, item.value)
            ctx.service.res.success('Success to init', { configs, resourceTypes })
        } catch (e) {
            this.logger.error(e)
            ctx.service.res.error(e as Error)
        }
    }
}
