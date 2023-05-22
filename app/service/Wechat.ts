/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import $ from '@util/util'
import md5 from 'md5'

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Wechat extends Service {
    // use wechat to login, get code, return openid, token
    async signIn(code: string) {
        const { ctx } = this

        const authURL = process.env.WX_APP_AUTH_URL as string // wx api, get login auth
        const appId = process.env.WX_APP_ID as string // wx AppID
        const appSecret = process.env.WX_APP_SECRET as string // wx AppSecret

        // get access_token, openid, unionid
        const url = `${authURL}?grant_type=authorization_code&appid=${appId}&secret=${appSecret}&js_code=${code}`
        const res = await $.get<undefined, WXAuthCodeAPI>(url)
        if (!res.openid || !res.session_key) throw new Error('Fail to get openid or session key')

        const config = await ctx.service.user.getConfig()
        // try to create user
        const [user, created] = await ctx.model.User.findOrCreate({
            where: {
                wxOpenId: res.openid
            },
            defaults: {
                chance: {
                    level: 0,
                    uploadSize: 5e6,
                    chatChance: 0,
                    chatChanceUpdateAt: new Date(),
                    chatChanceFree: parseInt(config.DEFAULT_FREE_CHAT_CHANCE || '0'),
                    chatChanceFreeUpdateAt: new Date(),
                    uploadChance: 0,
                    uploadChanceUpdateAt: new Date(),
                    uploadChanceFree: parseInt(config.DEFAULT_FREE_UPLOAD_CHANCE || '0'),
                    uploadChanceFreeUpdateAt: new Date()
                }
            },
            include: ctx.model.UserChance
        })

        // first create, set default user info
        if (created) {
            user.avatar = config.DEFAULT_AVATAR_USER as string
            user.name = `${ctx.__(config.DEFAULT_USERNAME as string)}${user.id}`
            await ctx.service.chat.dialog(user.id, 0) // add default dialog resource
        }

        // user is existed, update session key
        user.token = md5(`${res.openid}${new Date().getTime()}${code}`)
        user.tokenTime = new Date()
        user.wxSessionKey = res.session_key
        await user.save()

        return user
    }

    async signUp(code: string, openid: string, iv: string, encryptedData: string, fid?: number) {
        const { ctx } = this

        const user = await ctx.model.User.findOne({ where: { wxOpenId: openid }, include: ctx.model.UserChance })
        if (!user || !user.wxSessionKey) throw new Error('Fail to find user')

        if (user.phone) {
            // directly sign in
            user.token = md5(`${user.wxOpenId}${new Date().getTime()}${code}`)
            user.tokenTime = new Date()
        } else {
            // register, decode user info
            const appId = process.env.WX_APP_ID as string // wx AppID
            const res = await $.decryptData(encryptedData, iv, user.wxSessionKey, appId)
            // decode successfully
            if (res && res.phoneNumber && res.countryCode) {
                user.phone = res.phoneNumber
                user.countryCode = res.countryCode
                user.token = md5(`${user.wxOpenId}${new Date().getTime()}${code}`)
                user.tokenTime = new Date()
                if (fid) await this.shareReward(fid)
            } else throw new Error('Error to decode wechat userinfo')
        }

        await user.save()
        return user
    }

    // create default dialog, add manual book
    async addDefaultResource(userId: number) {
        const { ctx } = this
        const resource = await ctx.model.Resource.findOne({ where: { userId: 0 }, order: [['updatedAt', 'DESC']] })
        if (resource)
            await ctx.model.Dialog.findOrCreate({
                where: {
                    userId,
                    resourceId: resource.id
                },
                defaults: {
                    resourceId: resource.id
                }
            })
    }

    // user share and another one sign up, add reward
    async shareReward(userId: number) {
        const { ctx } = this
        const uc = await ctx.model.UserChance.findOne({ where: { userId } })
        if (!uc) throw Error('Fail to reward')

        const config = await ctx.service.user.getConfig()
        uc.uploadChance += parseInt(config.SHARE_REWARD_UPLOAD_CHANCE || '0')
        uc.chatChance += parseInt(config.SHARE_REWARD_CHAT_CHANCE || '0')
        uc.uploadChanceUpdateAt = new Date()
        uc.chatChanceUpdateAt = new Date()
        return await uc.save()
    }
    // user follow wechat public account, add reward
    async followReward(unionId: string, openId: string) {
        const { ctx } = this
        const user = await ctx.model.User.findOne({
            where: { wxUnionId: unionId, wxPublicOpenId: null },
            include: ctx.model.UserChance
        })
        if (!user || !user.chance) throw Error('Fail to reward')

        const config = await ctx.service.user.getConfig()
        user.chance.chatChance += parseInt(config.FOLLOW_REWARD_CHAT_CHANCE || '0')
        user.chance.chatChanceUpdateAt = new Date()
        user.wxPublicOpenId = openId // public open id
        await user.chance.save()
        return await user.save()
    }
}
