/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { UserCache } from '@interface/Cache'
import { ConfigVIP } from '@interface/controller/WeChat'
import { randomUUID } from 'crypto'
import { Service } from 'egg'
import md5 from 'md5'

const WEEK = 7 * 24 * 60 * 60 * 1000

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class User extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        return await this.ctx.service.uniAI.getConfig<T>(key)
    }

    // create user by phone, wx openid
    async create(phone: string | null = null, wxOpenId: string | null = null, fid: number = 0) {
        if (!phone && !wxOpenId) throw new Error('need one of phone, openid')
        const { ctx } = this
        const avatar = await this.getConfig('DEFAULT_AVATAR_USER')
        const user = await ctx.model.User.create({ wxOpenId, phone, avatar })
        user.name = `${await this.getConfig('DEFAULT_USERNAME')} NO.${user.id}`
        user.chance = await ctx.model.UserChance.create({
            userId: user.id,
            chatChanceFree: parseInt(await this.getConfig('WEEK_FREE_CHAT_CHANCE')),
            uploadChanceFree: parseInt(await this.getConfig('WEEK_FREE_UPLOAD_CHANCE')),
            uploadSize: parseInt(await this.getConfig('LIMIT_UPLOAD_SIZE'))
        })

        // give share reward
        if (fid) await this.shareReward(fid)
        return await user.save()
    }

    async signIn(userId: number) {
        const { ctx, app } = this

        const user = await ctx.model.User.findByPk(userId, { include: ctx.model.UserChance })
        // check banned or invalid user
        if (!user) throw new Error('Can not find user to sign in')
        if (user.isDel || !user.isEffect) throw new Error('User is invalid')

        // add free chat dialog
        if (!(await ctx.model.Dialog.count({ where: { userId: user.id, resourceId: null } })))
            await ctx.service.weChat.addDialog(user.id)

        // add default resource dialog
        const id = parseInt(await this.getConfig('INIT_RESOURCE_ID'))
        if (
            !(await ctx.model.Dialog.count({ where: { userId: user.id, resourceId: id } })) &&
            (await ctx.model.Resource.count({ where: { id } }))
        )
            await ctx.service.weChat.addDialog(user.id, id)

        if (!user.name) user.name = `${await this.getConfig('DEFAULT_USERNAME')} NO.${user.id}`
        const now = new Date()
        // set login token
        user.token = md5(`${now.getTime()}${randomUUID()}`)
        user.tokenTime = now

        // reset week free chat and upload
        if (now.getTime() - user.chance.chatChanceFreeUpdateAt.getTime() > WEEK) {
            user.chance.chatChanceFree = parseInt(await this.getConfig('DEFAULT_FREE_CHAT_CHANCE'))
            user.chance.chatChanceFreeUpdateAt = now
            await user.chance.save()
        }
        if (now.getTime() - user.chance.uploadChanceFreeUpdateAt.getTime() > WEEK) {
            user.chance.uploadChanceFree = parseInt(await this.getConfig('DEFAULT_FREE_UPLOAD_CHANCE'))
            user.chance.uploadChanceFreeUpdateAt = now
            await user.chance.save()
        }
        await user.save()

        // refresh cache
        const cache: UserCache = {
            ...user.dataValues,
            tokenTime: user.tokenTime.getTime(),
            chance: {
                ...user.chance.dataValues,
                chatChanceUpdateAt: user.chance.chatChanceUpdateAt.getTime(),
                uploadChanceUpdateAt: user.chance.uploadChanceUpdateAt.getTime(),
                chatChanceFreeUpdateAt: user.chance.chatChanceFreeUpdateAt.getTime(),
                uploadChanceFreeUpdateAt: user.chance.uploadChanceFreeUpdateAt.getTime()
            }
        }
        await app.redis.set(`user_${cache.id}`, JSON.stringify(cache))
        return cache
    }

    // user share and another one sign up, add reward
    async shareReward(userId: number) {
        const { ctx } = this
        const chance = await ctx.model.UserChance.findOne({ where: { userId } })
        if (!chance) throw Error('Fail to reward')

        chance.uploadChance += parseInt(await this.getConfig('SHARE_REWARD_UPLOAD_CHANCE'))
        chance.chatChance += parseInt(await this.getConfig('SHARE_REWARD_CHAT_CHANCE'))
        chance.uploadChanceUpdateAt = new Date()
        chance.chatChanceUpdateAt = new Date()
        return await chance.save()
    }

    // get user's benefit by level
    async getLevelBenefit(level: number) {
        const vips = await this.getConfig<ConfigVIP[]>('USER_VIP')
        const images = await this.getConfig<string[]>('USER_MENU_VIP_ICON')
        if (!vips[level]) throw new Error('User level is invalid')
        return vips[level].benefits.map((v, i) => {
            v.image = images[i]
            return v
        })
    }
    // update user cache in redis
    async updateUserCache(id: number) {
        const { ctx } = this
        const user = await ctx.model.User.findOne({
            where: { id, isDel: false, isEffect: true },
            include: { model: ctx.model.UserChance }
        })
        if (!user) throw new Error('User is not found')

        const cache: UserCache = {
            ...user.dataValues,
            tokenTime: user.tokenTime.getTime(),
            chance: {
                ...user.chance.dataValues,
                chatChanceUpdateAt: user.chance.chatChanceUpdateAt.getTime(),
                uploadChanceUpdateAt: user.chance.uploadChanceUpdateAt.getTime(),
                chatChanceFreeUpdateAt: user.chance.chatChanceFreeUpdateAt.getTime(),
                uploadChanceFreeUpdateAt: user.chance.uploadChanceFreeUpdateAt.getTime()
            }
        }
        await ctx.app.redis.set(`user_${id}`, JSON.stringify(cache))
        return cache
    }
}
