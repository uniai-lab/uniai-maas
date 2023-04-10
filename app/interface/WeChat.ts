/** @format */

interface WXAuthCodeAPI {
    openid: string
    unionid: string
    session_key: string
    errcode: number
    errmsg: string
}

interface WXAccessTokenStore {
    token: string
    time: Date
}

interface WXAccessTokenAPI {
    access_token: string
    expires_in: number
    errcode: number
    errmsg: string
}
interface WXSecCheckAPI {
    errcode: number
    errmsg: string
}

interface WXUserPhoneNumberAPI {
    errcode: number
    errmsg: string
    phone_info: {
        phoneNumber: string
        purePhoneNumber: string
        countryCode: string
        watermark: {
            timestamp: number
            appid: string
        }
    }
}

interface WXDecodedData {
    phoneNumber: string
    purePhoneNumber: string
    countryCode: number
    watermark: {
        appid: string
        timestamp: number
    }
}
