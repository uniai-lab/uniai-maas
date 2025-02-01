/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { randomUUID } from 'crypto'
import { Service } from 'egg'
import md5 from 'md5'
import { ChatModelProvider, ModelProvider } from 'uniai'
import { ConfigVIP, LevelChatProvider } from '@interface/Config'
import { UserCache } from '@interface/Cache'
import { Option } from '@interface/controller/Web'
import $ from '@util/util'

const FREE_CHANCE_TIME = 24 * 60 * 60 * 1000 // update free chance everyday
const { OTHER_MODEL } = process.env

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

    // create user by phone, wx openid
    async findOrCreate(where: { wxOpenId?: string; phone?: string }, fid?: number) {
        if (!where.phone && !where.wxOpenId) throw new Error('Need phone or openid')
        if (where.phone && where.wxOpenId) delete where.phone // first use wechat

        const { ctx } = this
        const { transaction } = ctx

        const user = await ctx.model.User.findOne({ where, attributes: ['id'], transaction })
        if (user) return { user, create: false }
        else {
            // create finish, give share reward to fid user
            if (fid) {
                const user = await ctx.model.User.findByPk(fid, { transaction })
                if (!user) throw new Error('Fail to find reward user')

                user.uploadChance += parseInt(await this.getConfig('SHARE_REWARD_UPLOAD_CHANCE'))
                user.chatChance += parseInt(await this.getConfig('SHARE_REWARD_CHAT_CHANCE'))
                await user.save({ transaction })
            }

            return {
                user: await ctx.model.User.create(
                    {
                        ...where,
                        avatar: await this.getConfig('DEFAULT_AVATAR_USER'),
                        chatChanceFree: (await this.getConfig<number[]>('FREE_CHAT_CHANCE'))[0],
                        uploadChanceFree: (await this.getConfig<number[]>('FREE_UPLOAD_CHANCE'))[0],
                        uploadSize: parseInt(await this.getConfig('LIMIT_UPLOAD_SIZE'))
                    },
                    { transaction }
                ),
                create: true
            }
        }
    }

    // user sign in (NOTE: refresh cache)
    async signIn(id: number) {
        const { ctx } = this
        const { transaction } = ctx

        const user = await ctx.model.User.findByPk(id, { transaction })
        // check banned or invalid user
        if (!user) throw new Error('Can not find user to sign in')
        if (user.isDel || !user.isEffect) throw new Error('User is invalid')

        // set default user name
        if (!user.name) user.name = `${await this.getConfig('DEFAULT_USERNAME')} NO.${user.id}`

        // set access token
        const now = new Date()
        user.token = md5(`${user.id}${now.getTime()}${randomUUID()}`)
        user.tokenTime = now
        return await user.save({ transaction })
    }

    // update user free chance by level
    async updateFreeChance(id: number) {
        const cache = await this.get(id)
        if (!cache) throw new Error('User cache not found')
        const now = new Date()

        // refresh free chat chance
        if (now.getTime() - cache.freeChanceUpdateAt > FREE_CHANCE_TIME) {
            const { ctx } = this
            const { transaction } = ctx
            const user = await ctx.model.User.findByPk(id, {
                attributes: ['id', 'chatChanceFree', 'uploadChanceFree', 'freeChanceUpdateAt', 'level'],
                transaction
            })
            if (!user) throw new Error('Can not find user')

            const chatChance = await this.getConfig<number[]>('FREE_CHAT_CHANCE')
            const uploadChance = await this.getConfig<number[]>('FREE_UPLOAD_CHANCE')
            // update db
            user.chatChanceFree = chatChance[user.level] || 0
            user.uploadChanceFree = uploadChance[user.level] || 0
            user.freeChanceUpdateAt = now
            await user.save({ transaction })
        }
    }

    // add user chance
    async addUserChance(id: number, chance: number) {
        const { ctx } = this
        const { transaction } = ctx

        const user = await ctx.model.User.findByPk(id, { attributes: ['id', 'chatChance'], transaction })
        if (!user) throw new Error('Can not find the user')

        user.chatChance += chance
        return await user.save({ transaction })
    }

    // update user level
    async updateLevel(id: number, score: number = 0) {
        const cache = await this.get(id)
        if (!cache) throw new Error('User cache not found')
        const now = Date.now()
        const expire = cache.levelExpiredAt

        // expire=0 means forever
        if (score || (expire > 0 && now > expire)) {
            const { ctx } = this
            const { transaction } = ctx
            const user = await ctx.model.User.findByPk(id, {
                attributes: ['id', 'score', 'level', 'levelExpiredAt'],
                transaction
            })
            if (!user) throw new Error('Can not find the user')

            if (expire > 0 && now > expire) {
                user.level = 0
                user.levelExpiredAt = new Date(0)
            }

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
            await user.save({ transaction })
        }
    }

    // get user benefits by level
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

        const models = this.service.uniAI.getChatModels()
        const others = OTHER_MODEL.split(',')
        const options = await Promise.all(
            models.map<Promise<Option>>(async v => {
                const disabled = await this.checkLevelModel(cache.level, v.value)
                return {
                    value: v.value,
                    label: v.provider,
                    disabled,
                    children:
                        v.value === ChatModelProvider.Other
                            ? others.map(v => ({ disabled, value: v, label: v }))
                            : v.models.map(v => ({ disabled, value: v, label: v }))
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
        return level < res[provider]
    }
}
