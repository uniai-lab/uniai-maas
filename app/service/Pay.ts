/** @format */
// Pay services

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { PayType } from '@interface/Enum'
import { Service } from 'egg'
import WxPay from 'wechatpay-node-v3'
import { Inative } from 'wechatpay-node-v3/dist/lib/interface'
const { WX_PAY_KEY, WX_PAY_CERT, WX_APP_ID, WX_MCH_ID } = process.env

const wx = new WxPay({
    appid: WX_APP_ID,
    mchid: WX_MCH_ID,
    publicKey: Buffer.from(WX_PAY_CERT),
    privateKey: Buffer.from(WX_PAY_KEY)
})

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Pay extends Service {
    // success response format
    async create(id: number, type: PayType) {
        if (type === PayType.WeChat) {
            console.log(id)
            const params: Inative = {
                description: '测试支付',
                out_trade_no: '11011011',
                notify_url: 'https://api.test.uniai.cas-ll.cn/pay/wx',
                amount: { total: 1 }
            }
            const res = await wx.transactions_native(params)
            if (res.error) throw new Error(res.error)
            return res
        } else throw new Error('Pay type not support')
    }
}
