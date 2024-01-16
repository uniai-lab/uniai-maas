/** @format */
// This is a middleware to check business user login auth, add to controller -> action

import { Context } from 'egg'
import { GeeTest } from 'gt4-node-sdk'
const { GEE_TEST_ID, GEE_TEST_KEY } = process.env

// check company auth
export default function validate() {
    const gt = new GeeTest({
        captchaId: GEE_TEST_ID,
        captchaKey: GEE_TEST_KEY
    })
    return async (ctx: Context, next: () => Promise<any>) => {
        // check admin token from header
        const lotNumber = ctx.get('lot_number')
        const captchaOutput = ctx.get('captcha_output')
        const passToken = ctx.get('pass_token')
        const genTime = ctx.get('gen_time')
        const res = await gt.validate({ lotNumber, captchaOutput, passToken, genTime })
        if (res.result === 'success') return await next()
        else throw new Error('Fail to validate captcha')
    }
}
