/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { randomUUID } from 'crypto'
import { Service } from 'egg'
import md5 from 'md5'
import { ConfigVIP, LevelModel } from '@interface/Config'
import { UserCache } from '@interface/Cache'
import { Option } from '@interface/controller/Web'
import $ from '@util/util'
import { ModelProvider } from 'uniai'

const FREE_SPLIT_TIME = 24 * 60 * 60 * 1000 // update free chance everyday

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class User extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        return await this.service.uniAI.getConfig<T>(key)
    }

    // create user by phone, wx openid
    async create(phone: string | null = null, wxOpenId: string | null = null, fid: number = 0) {
        if (!phone && !wxOpenId) throw new Error('need one of phone, openid')

        const { ctx } = this
        const user = await ctx.model.User.create({
            wxOpenId,
            phone,
            avatar: await this.getConfig('DEFAULT_AVATAR_USER'),
            chatChanceFree: (await this.getConfig<number[]>('FREE_CHAT_CHANCE'))[0],
            uploadChanceFree: (await this.getConfig<number[]>('FREE_UPLOAD_CHANCE'))[0],
            uploadSize: parseInt(await this.getConfig('LIMIT_UPLOAD_SIZE'))
        })

        // create finish, give share reward to fid user
        if (fid) await this.shareRewardUser(fid)

        return user
    }

    // user sign in (NOTE: refresh cache)
    async signIn(userId: number) {
        const { ctx } = this

        const user = await ctx.model.User.findByPk(userId)
        // check banned or invalid user
        if (!user) throw new Error('Can not find user to sign in')
        if (user.isDel || !user.isEffect) throw new Error('User is invalid')

        // set default user name
        if (!user.name) user.name = `${await this.getConfig('DEFAULT_USERNAME')} NO.${user.id}`

        // set access token
        const now = new Date()
        user.token = md5(`${user.id}${now.getTime()}${randomUUID()}`)
        user.tokenTime = now
        return await user.save()
    }

    // user share and another one sign up, add reward
    async shareRewardUser(id: number) {
        const { ctx } = this
        const user = await ctx.model.User.findByPk(id)
        if (!user) throw Error('Fail to find reward user')

        user.uploadChance += parseInt(await this.getConfig('SHARE_REWARD_UPLOAD_CHANCE'))
        user.chatChance += parseInt(await this.getConfig('SHARE_REWARD_CHAT_CHANCE'))
        return await user.save()
    }

    // update user free chance
    async updateUserChance(id: number) {
        const cache = await this.getUserCache(id)
        if (!cache) throw new Error('User cache not found')

        const now = new Date()
        // refresh free chat chance
        if (now.getTime() - cache.freeChanceUpdateAt > FREE_SPLIT_TIME) {
            const user = await this.ctx.model.User.findByPk(id, {
                attributes: ['id', 'chatChanceFree', 'uploadChanceFree', 'freeChanceUpdateAt']
            })
            if (!user) throw new Error('Can not find user')

            // update db
            user.chatChanceFree = (await this.getConfig<number[]>('FREE_CHAT_CHANCE'))[0]
            user.uploadChanceFree = (await this.getConfig<number[]>('FREE_UPLOAD_CHANCE'))[0]
            user.freeChanceUpdateAt = now
            await user.save()
        }
    }

    // update user cache in redis
    async getUserCache(id: number) {
        return $.json<UserCache>(await this.app.redis.get(`user_${id}`))
    }

    async setUserCache(id: number) {
        const { ctx, app } = this
        const user = await ctx.model.User.findByPk(id)
        if (!user) throw new Error('Can not find the user')
        const cache: UserCache = {
            ...user.dataValues,
            tokenTime: user.tokenTime.getTime(),
            freeChanceUpdateAt: user.freeChanceUpdateAt.getTime(),
            levelExpiredAt: user.levelExpiredAt.getTime()
        }
        await app.redis.set(`user_${id}`, JSON.stringify(cache))
    }

    // update user level
    async updateLevel(id: number, level: number) {
        const user = await this.ctx.model.User.findByPk(id, { attributes: ['id', 'level', 'levelExpiredAt'] })
        if (!user) throw new Error('Can not find the user')
        user.level = level
        user.levelExpiredAt = $.nextMonthSameTime()
        return user.save()
    }

    // get user benefits by level
    async getLevelBenefit(level: number) {
        const vips = await this.getConfig<ConfigVIP[]>('USER_VIP')
        const images = await this.getConfig<string[]>('USER_MENU_VIP_ICON')

        if (level < 0) level = 0
        if (level >= vips.length) level = vips.length - 1

        return vips[level].benefits.map((v, i) => {
            v.image = images[i]
            return v
        })
    }

    // get user models by level
    async getLevelModel(level: number) {
        const models = await this.service.uniAI.getModels()
        const options = await Promise.all(
            models.map<Promise<Option>>(async v => {
                const disabled = await this.checkLevelModel(level, v.value)
                return {
                    value: v.value,
                    label: v.provider,
                    disabled,
                    children: v.models.map(v => ({ disabled, value: v, label: v }))
                }
            })
        )
        options
            .sort((a, b) => {
                if (a.disabled && !b.disabled) return 1
                if (!a.disabled && b.disabled) return -1
                return 0
            })
            .unshift({
                value: '',
                label: this.ctx.__('auto provider'),
                disabled: false,
                children: [{ value: '', label: this.ctx.__('auto model'), disabled: false }]
            })
        return options
    }

    // check user level model, return disable or not
    async checkLevelModel(level: number, provider?: ModelProvider) {
        if (!provider) return false
        const res = await this.getConfig<LevelModel>('LEVEL_MODEL')
        return level >= res[provider] ? false : true
    }
}
