/** @format */
interface WXAuthCodeRequest {
    grant_type: 'authorization_code'
    appid: string
    secret: string
    js_code: string
}

interface WXAuthCodeResponse {
    openid?: string
    unionid?: string
    session_key?: string
    errcode?: number
    errmsg?: string
}

interface WXAccessToken {
    token: string
    time: Date
}

interface WXAccessTokenAPI {
    access_token?: string
    expires_in?: number
    errcode?: number
    errmsg?: string
}
interface WXSecCheckAPI {
    errcode?: number
    errmsg?: string
}

interface WXUserPhoneNumberAPI {
    errcode?: number
    errmsg?: string
    phone_info?: {
        phoneNumber?: string
        purePhoneNumber?: string
        countryCode?: string
        watermark?: {
            timestamp?: number
            appid?: string
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
