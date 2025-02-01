/** @format */

import Dysmsapi, { SendSmsRequest } from '@alicloud/dysmsapi20170525'
import { Config } from '@alicloud/openapi-client'

const { ALI_KEY_ID, ALI_KEY_SECRET, ALI_SMS_TEMPLATE, ALI_SMS_SIGN } = process.env

const config = new Config({ accessKeyId: ALI_KEY_ID, accessKeySecret: ALI_KEY_SECRET })
config.endpoint = `dysmsapi.aliyuncs.com`
const ali = new Dysmsapi(config)

export default {
    async sendCode(phone: string, code: string | number) {
        const request = new SendSmsRequest()
        request.signName = ALI_SMS_SIGN
        request.templateParam = JSON.stringify({ code })
        request.templateCode = ALI_SMS_TEMPLATE
        request.phoneNumbers = phone
        const res = await ali.sendSms(request)
        if (res.body?.code !== 'OK') throw new Error(res.body?.message)
        return res
    }
}
