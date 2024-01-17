/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { ConfigMenuV2, ConfigVIP } from '@interface/controller/WeChat'
import { Service } from 'egg'

const LIMIT_SMS_COUNT = 5
const LIMIT_SMS_EXPIRE = 5 * 60

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
            (await ctx.service.user.create(phone, null, fid))
        return await ctx.service.user.signIn(id)
    }
}
