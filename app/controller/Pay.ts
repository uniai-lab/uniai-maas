/** @format */

import {
    HTTPController,
    HTTPMethod,
    HTTPMethodEnum,
    Context,
    EggContext,
    HTTPBody,
    Middleware,
    HTTPQuery
} from '@eggjs/tegg'
import { PayType } from '@interface/Enum'
import {
    CheckPayResponse,
    CreatePayRequest,
    CreatePayResponse,
    PayItem,
    WXNotifyRequest
} from '@interface/controller/Pay'
import auth from '@middleware/authC'
import log from '@middleware/log'
import transaction from '@middleware/transaction'

@HTTPController({ path: '/pay' })
export default class Pay {
    // pay callback
    @Middleware(log(), transaction())
    @HTTPMethod({ path: '/callback', method: HTTPMethodEnum.POST })
    async index(@Context() ctx: EggContext, @HTTPBody() params: WXNotifyRequest) {
        await ctx.service.pay.callback(PayType.WeChat, params)
        ctx.service.res.success('Success to payment callback')
    }

    // list pay items
    @HTTPMethod({ path: '/list', method: HTTPMethodEnum.GET })
    async list(@Context() ctx: EggContext) {
        const res = await ctx.service.pay.list()
        const data = res.map<PayItem>(({ id, title, price, description }) => ({ id, title, price, description }))
        ctx.service.res.success('Success to create pay', data)
    }

    // create payment
    @Middleware(auth(), log())
    @HTTPMethod({ path: '/create', method: HTTPMethodEnum.POST })
    async create(@Context() ctx: EggContext, @HTTPBody() params: CreatePayRequest) {
        const { id, type } = params
        const userId = ctx.user!.id
        const res = await ctx.service.pay.create(id, type, userId)
        if (!res.detail) throw new Error('Can not get payment QR code')
        const data: CreatePayResponse = {
            id: res.id,
            transactionId: res.transactionId,
            base64: await ctx.service.util.getQRCode(res.detail['code_url'])
        }
        ctx.service.res.success('Success to create pay', data)
    }

    // check payment
    @Middleware(auth(), transaction())
    @HTTPMethod({ path: '/check', method: HTTPMethodEnum.GET })
    async check(@Context() ctx: EggContext, @HTTPQuery() id: string) {
        const userId = ctx.user!.id
        const payId = parseInt(id)
        if (!payId) throw new Error('Invalid id')

        const { transactionId, amount, currency, status } = await ctx.service.pay.check(payId, userId)

        const data: CheckPayResponse = { transactionId, amount, currency, status }
        ctx.service.res.success('Success to check pay', data)
    }
}
