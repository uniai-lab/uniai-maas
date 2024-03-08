/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { randomUUID } from 'crypto'
import { Service } from 'egg'
import md5 from 'md5'
import { ConfigVIP, LevelChatProvider } from '@interface/Config'
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

    // update user cache in redis
    async get(id: number) {
        return $.json<UserCache>(await this.app.redis.get(`user_${id}`))
    }

    async set(id: number) {
        const { ctx, app } = this
        const user = await ctx.model.User.findByPk(id)
        if (!user) throw new Error('Can not find the user')
        const cache: UserCache = {
            ...user.dataValues,
            tokenTime: user.tokenTime.getTime(),
            freeChanceUpdateAt: user.freeChanceUpdateAt.getTime(),
            levelExpiredAt: user.levelExpiredAt.getTime()
        }
        return await app.redis.set(`user_${id}`, JSON.stringify(cache))
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
        if (fid) await this.shareReward(fid)

        return user
    }

    // user sign in (NOTE: refresh cache)
    async signIn(id: number) {
        const { ctx } = this

        const user = await ctx.model.User.findByPk(id)
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
    async shareReward(id: number) {
        const { ctx } = this
        const user = await ctx.model.User.findByPk(id)
        if (!user) throw Error('Fail to find reward user')

        user.uploadChance += parseInt(await this.getConfig('SHARE_REWARD_UPLOAD_CHANCE'))
        user.chatChance += parseInt(await this.getConfig('SHARE_REWARD_CHAT_CHANCE'))
        return await user.save()
    }

    // update user free chance by level
    async updateFreeChance(id: number) {
        const cache = await this.get(id)
        if (!cache) throw new Error('User cache not found')

        const now = new Date()
        // refresh free chat chance
        if (now.getTime() - cache.freeChanceUpdateAt > FREE_SPLIT_TIME) {
            const user = await this.ctx.model.User.findByPk(id, {
                attributes: ['id', 'chatChanceFree', 'uploadChanceFree', 'freeChanceUpdateAt']
            })
            if (!user) throw new Error('Can not find user')

            const chatChance = await this.getConfig<number[]>('FREE_CHAT_CHANCE')
            const uploadChance = await this.getConfig<number[]>('FREE_UPLOAD_CHANCE')
            // update db
            user.chatChanceFree = chatChance[user.level] || chatChance[chatChance.length - 1] || 0
            user.uploadChanceFree = uploadChance[user.level] || uploadChance[chatChance.length - 1] || 0
            user.freeChanceUpdateAt = now
            await user.save()
        }
    }

    // add user chance
    async addUserChance(id: number, chance: number) {
        const user = await this.ctx.model.User.findByPk(id, { attributes: ['id', 'chatChance'] })
        if (!user) throw new Error('Can not find the user')

        user.chatChance += chance
        return await user.save()
    }

    // update user level
    async updateLevel(id: number, score: number = 0) {
        const cache = await this.get(id)
        if (!cache) throw new Error('User cache not found')
        const now = Date.now()
        const expired = cache.levelExpiredAt
        console.log('updatelevel')
        console.log('id', id)
        console.log('score', score)

        if ((expired > 0 && now >= expired) || score) {
            const { ctx } = this
            const user = await ctx.model.User.findByPk(id, { attributes: ['id', 'score', 'level', 'levelExpiredAt'] })
            if (!user) throw new Error('Can not find the user')

            if (expired > 0 && now >= expired) {
                user.level = 0
                user.levelExpiredAt = new Date(0)
            }

            if (score) {
                // update level by score
                user.score += score
                const origin = user.level
                const levels = await this.getConfig<number[]>('LEVEL_SCORE')
                for (const i in levels) if (user.score >= levels[i]) user.level = parseInt(i)

                // level upgraded, cost score, set expire time
                if (user.level > origin) {
                    user.score -= levels[user.level]
                    user.levelExpiredAt = $.nextMonthSameTime()
                } else user.level = origin
            }
            await user.save()
        }
    }

    // get user benefits
    async getBenefit(id: number) {
        const cache = await this.get(id)
        if (!cache) throw new Error('User cache not found')

        const vips = await this.getConfig<ConfigVIP[]>('USER_VIP')
        const images = await this.getConfig<string[]>('USER_MENU_VIP_ICON')

        return vips[Math.max(0, Math.min(vips.length - 1, cache.level))].benefits.map((v, i) => {
            v.image = images[i]
            return v
        })
    }

    // get user models by level
    async getModel(id: number) {
        const cache = await this.get(id)
        if (!cache) throw new Error('User cache not found')

        const models = await this.service.uniAI.getChatModels()
        const options = await Promise.all(
            models.map<Promise<Option>>(async v => {
                const disabled = await this.checkLevelModel(cache.level, v.value)
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
                value: null,
                label: this.ctx.__('auto provider'),
                disabled: false,
                children: [{ value: null, label: this.ctx.__('auto model'), disabled: false }]
            })
        return options
    }

    // check user level model, return disable or not
    async checkLevelModel(level: number, provider?: ModelProvider) {
        if (!provider) return false
        const res = await this.getConfig<LevelChatProvider>('LEVEL_CHAT_PROVIDER')
        return level >= res[provider] ? false : true
    }
}
