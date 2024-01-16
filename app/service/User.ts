/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { UserCache } from '@interface/Cache'
import { randomUUID } from 'crypto'
import { Service } from 'egg'
import md5 from 'md5'

const LIMIT_SMS_COUNT = 5
const LIMIT_SMS_EXPIRE = 5 * 60
const WEEK = 7 * 24 * 60 * 60 * 1000

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class User extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        return await this.ctx.service.uniAI.getConfig<T>(key)
    }

    // create user by phone, wx openid
    async create(phone: string | null = null, wxOpenId: string | null = null, fid: number = 0) {
        const { ctx } = this
        const now = new Date()
        // create a new user
        const avatar = await this.getConfig('DEFAULT_AVATAR_USER')
        const user = await ctx.model.User.create({ wxOpenId, phone, avatar })
        user.name = `${await this.getConfig('DEFAULT_USERNAME')} NO.${user.id}`
        user.chance = await ctx.model.UserChance.create({
            userId: user.id,
            chatChanceFree: parseInt(await this.getConfig('WEEK_FREE_CHAT_CHANCE')),
            chatChanceFreeUpdateAt: now,
            uploadChanceFree: parseInt(await this.getConfig('WEEK_FREE_UPLOAD_CHANCE')),
            uploadChanceFreeUpdateAt: now,
            uploadSize: parseInt(await this.getConfig('LIMIT_UPLOAD_SIZE'))
        })

        // give share reward
        if (fid) await this.shareReward(fid)
        return await user.save()
    }

    async signIn(userId: number) {
        const { ctx, app } = this
        const { weChat } = ctx.service

        const user = await ctx.model.User.findByPk(userId, { include: ctx.model.UserChance })
        // check banned or invalid user
        if (!user) throw new Error('Can not find user to sign in')
        if (user.isDel || !user.isEffect) throw new Error('User is invalid')

        // add free chat dialog
        if (!(await ctx.model.Dialog.count({ where: { userId: user.id, resourceId: null } })))
            await weChat.addDialog(user.id)

        // add default resource dialog
        const id = parseInt(await weChat.getConfig('INIT_RESOURCE_ID'))
        if (
            !(await ctx.model.Dialog.count({ where: { userId: user.id, resourceId: id } })) &&
            (await ctx.model.Resource.count({ where: { id } }))
        )
            await weChat.addDialog(user.id, id)

        const now = new Date()
        // set login token
        user.token = md5(`${now.getTime()}${randomUUID()}`)
        user.tokenTime = now

        // reset week free chat and upload
        if (now.getTime() - user.chance.chatChanceFreeUpdateAt.getTime() > WEEK) {
            user.chance.chatChanceFree = parseInt(await weChat.getConfig('DEFAULT_FREE_CHAT_CHANCE'))
            user.chance.chatChanceFreeUpdateAt = now
            await user.chance.save()
        }
        if (now.getTime() - user.chance.uploadChanceFreeUpdateAt.getTime() > WEEK) {
            user.chance.uploadChanceFree = parseInt(await weChat.getConfig('DEFAULT_FREE_UPLOAD_CHANCE'))
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

    // send SMS code
    async sendSMSCode(phone: string) {
        return await this.ctx.model.PhoneCode.create({
            phone,
            code: '888888',
            expire: Math.floor(Date.now() / 1000 + LIMIT_SMS_EXPIRE)
        })
    }

    // login
    async login(phone: string, code: string, fid?: number) {
        const { ctx } = this
        const res = await ctx.model.PhoneCode.findOne({ where: { phone }, order: [['id', 'DESC']] })
        if (!res) throw new Error('Can not find the phone number')

        // validate code
        await res.increment('count')
        if (res.count > LIMIT_SMS_COUNT) throw new Error('Code try too many times')
        if (Date.now() / 1000 > res.expire) throw new Error('Code is expired 5 mins')
        if (res.code !== code) throw new Error('Code is invalid')

        // find user and sign in
        const { id } =
            (await ctx.model.User.findOne({ where: { phone }, attributes: ['id'] })) ||
            (await this.create(phone, null, fid))
        return await this.signIn(id)
    }
}
