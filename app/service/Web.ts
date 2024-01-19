/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { ConfigMenuV2, ConfigVIP } from '@interface/controller/WeChat'
import { Service } from 'egg'
import { Op } from 'sequelize'

const LIMIT_SMS_WAIT = 1 * 60 * 1000
const LIMIT_SMS_EXPIRE = 5 * 60 * 1000
const LIMIT_SMS_COUNT = 5

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Web extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        return await this.ctx.service.uniAI.getConfig<T>(key)
    }

    // get all user needed configs
    async getUserConfig() {
        return {
            appName: await this.getConfig('APP_NAME'),
            appVersion: await this.getConfig('APP_VERSION'),
            footer: await this.getConfig('FOOT_TIP'),
            footerCopy: await this.getConfig('FOOT_COPY'),
            officialAccount: await this.getConfig('OFFICIAL'),
            vip: await this.getConfig<ConfigVIP[]>('USER_VIP'),
            menuMember: await this.getConfig<ConfigMenuV2>('USER_MENU_MEMBER'),
            menuInfo: await this.getConfig<ConfigMenuV2>('USER_MENU_INFO'),
            menuShare: await this.getConfig<ConfigMenuV2>('USER_MENU_SHARE'),
            menuFocus: await this.getConfig<ConfigMenuV2>('USER_MENU_FOCUS'),
            menuAdv: await this.getConfig<ConfigMenuV2>('USER_MENU_ADV')
        }
    }

    // send SMS code
    async sendSMSCode(phone: string) {
        const { ctx } = this
        const count = await ctx.model.PhoneCode.count({
            where: { phone, createdAt: { [Op.gte]: new Date(Date.now() - LIMIT_SMS_WAIT) } }
        })
        if (count) throw new Error('Too many times request SMS code')

        return await ctx.model.PhoneCode.create({
            phone,
            code: '888888',
            expire: Math.floor(Date.now() / 1000 + LIMIT_SMS_EXPIRE)
        })
    }

    // login
    async login(phone: string, code: string, fid?: number) {
        const { ctx } = this
        const res = await ctx.model.PhoneCode.findOne({
            where: { phone, createdAt: { [Op.gte]: new Date(Date.now() - LIMIT_SMS_EXPIRE) } },
            order: [['id', 'DESC']]
        })
        if (!res) throw new Error('Can not find the phone number')
        await res.increment('count')

        // validate code
        if (res.count >= LIMIT_SMS_COUNT) throw new Error('Try too many times')
        if (res.code !== code) throw new Error('Code is invalid')

        // find user and sign in
        const { id } =
            (await ctx.model.User.findOne({ where: { phone }, attributes: ['id'] })) ||
            (await ctx.service.user.create(phone, null, fid))
        return await ctx.service.user.signIn(id)
    }
}
