/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, HTTPBody, Middleware, HTTPQuery } from '@eggjs/tegg'
import { UserContext } from '@interface/Context'
import auth from '@middleware/authC'
import transaction from '@middleware/transaction'
import log from '@middleware/log'
import captcha from '@middleware/captcha'
import {
    SMSCodeRequest,
    SMSCodeResponse,
    LoginRequest,
    UserinfoResponse,
    ConfigResponse
} from '@interface/controller/Web'
import { AnnounceResponse } from '@interface/controller/WeChat'

@HTTPController({ path: '/web' })
export default class Web {
    // app configs
    @HTTPMethod({ path: '/config', method: HTTPMethodEnum.GET })
    async config(@Context() ctx: UserContext) {
        const data: ConfigResponse = await ctx.service.web.getUserConfig()
        ctx.service.res.success('Success to list config', data)
    }

    @HTTPMethod({ path: '/file', method: HTTPMethodEnum.GET })
    async file(@Context() ctx: UserContext, @HTTPQuery() path: string, @HTTPQuery() name: string) {
        if (!path) throw new Error('Path is null')

        // file stream
        ctx.body = await ctx.service.uniAI.file(path, name)
    }

    // announcement
    @HTTPMethod({ path: '/announce', method: HTTPMethodEnum.GET })
    async announce(@Context() ctx: UserContext) {
        const res = await ctx.service.weChat.announce()

        const data: AnnounceResponse[] = res.map(({ id, title, content, closeable }) => ({
            id,
            title,
            content,
            closeable
        }))

        ctx.service.res.success('Successfully list announcements', data)
    }

    @Middleware(log(), captcha())
    @HTTPMethod({ path: '/get-sms-code', method: HTTPMethodEnum.POST })
    async getSMSCode(@Context() ctx: UserContext, @HTTPBody() params: SMSCodeRequest) {
        const { id, phone } = await ctx.service.web.sendSMSCode(params.phone)
        const data: SMSCodeResponse = { id, phone }
        ctx.service.res.success('Success to WeChat login', data)
    }

    // WeChat login
    @Middleware(log(), transaction())
    @HTTPMethod({ path: '/login', method: HTTPMethodEnum.POST })
    async login(@Context() ctx: UserContext, @HTTPBody() params: LoginRequest) {
        const { phone, code } = params

        const user = await ctx.service.web.login(phone, code)
        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime,
            phone: user.phone,
            chance: {
                level: user.chance.level,
                uploadSize: user.chance.uploadSize,
                totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
            },
            benefit: await ctx.service.user.getLevelBenefit(user.chance.level)
        }

        ctx.service.res.success('Success to WeChat login', data)
    }

    // get user info
    @Middleware(auth())
    @HTTPMethod({ path: '/userinfo', method: HTTPMethodEnum.GET })
    async userInfo(@Context() ctx: UserContext) {
        const user = ctx.user!

        const data: UserinfoResponse = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            username: user.username,
            token: user.token,
            tokenTime: user.tokenTime,
            phone: user.phone,
            chance: {
                level: user.chance.level,
                uploadSize: user.chance.uploadSize,
                totalChatChance: user.chance.chatChance + user.chance.chatChanceFree,
                totalUploadChance: user.chance.uploadChance + user.chance.uploadChanceFree
            },
            benefit: await ctx.service.user.getLevelBenefit(user.chance.level)
        }
        ctx.service.res.success('User information', data)
    }
}
