/**
 * Common utils for this project
 *
 * @format
 * @devilyouwei
 */

import crypto from 'crypto'
import pdf from '@cyber2024/pdf-parse-fixed'
import { extname } from 'path'
import libreoffice from 'libreoffice-convert'
import { readFileSync, writeFileSync } from 'fs'
import axios, { AxiosRequestConfig } from 'axios'
import { sentences } from 'sbd'
import { encode, decode } from 'gpt-3-encoder'
import { google } from 'googleapis'
import { convert } from 'html-to-text'
import { similarity } from 'ml-distance'
import { path as ROOT_PATH } from 'app-root-path'
import Filter from 'mint-filter'
import COS from 'cos-nodejs-sdk-v5'
import Redis from 'ioredis'

const MIN_SPLIT_SIZE = 400
const ACCESS_TOKEN_EXPIRE = 3600 * 1000
const ERR_CODE = 87014
const {
    REDIS_PORT,
    REDIS_HOST,
    COS_SECRET_ID,
    COS_SECRET_KEY,
    GOOGLE_SEARCH_API_TOKEN,
    GOOGLE_SEARCH_ENGINE_ID,
    WX_APP_ACCESS_TOKEN_URL,
    WX_APP_ID,
    WX_APP_SECRET,
    WX_APP_MSG_CHECK,
    COS_BUCKET,
    COS_REGION
} = process.env

// redis cache
const redis = new Redis(REDIS_PORT, REDIS_HOST)
// tencent cos service
const cos = new COS({ SecretId: COS_SECRET_ID, SecretKey: COS_SECRET_KEY })
// sensitive words filter
const json = JSON.parse(readFileSync(`${ROOT_PATH}/config/sensitive.json`, 'utf-8'))
const filter = new Filter(json)
// search engine API
const customsearch = google.customsearch('v1')

export default {
    // http get request
    async get<RequestT = any, ResponseT = any>(
        url: string,
        params?: RequestT,
        config?: AxiosRequestConfig
    ): Promise<ResponseT> {
        return (await axios.get(url, { params, ...config })).data
    },
    // http post request
    async post<RequestT, ResponseT>(url: string, body?: RequestT, config?: AxiosRequestConfig): Promise<ResponseT> {
        return (await axios.post(url, body, config)).data
    },
    // search online
    async search(prompt: string, num: number) {
        return (
            await customsearch.cse.list({
                auth: GOOGLE_SEARCH_API_TOKEN,
                cx: GOOGLE_SEARCH_ENGINE_ID,
                q: prompt,
                num // 返回搜索结果数量
            })
        ).data
    },
    // extract text from an URL
    async url2text(url: string) {
        const html = (await this.get(url, undefined, { timeout: 5000 })) as string
        return this.html2text(html)
    },
    // extract text from HTML
    html2text(html: string) {
        return convert(html, {
            selectors: [
                { selector: 'a', format: 'inline' },
                { selector: 'button', format: 'skip' },
                { selector: 'img', format: 'skip' }
            ]
        })
    },
    // filter sensitive words and replace
    filterSensitive(content: string, replace: string = '') {
        return this.jsonFilterSensitive(content, replace)
    },
    // get wechat access token for wx miniapp
    async getWxAccessToken(): Promise<string> {
        const s = await this.getCache<WXAccessToken>('wx_access_token')
        if (s && Date.now() - new Date(s.time).getTime() <= ACCESS_TOKEN_EXPIRE) {
            return s.token
        } else {
            const url = `${WX_APP_ACCESS_TOKEN_URL}?grant_type=client_credential&appid=${WX_APP_ID}&secret=${WX_APP_SECRET}`
            const res: WXAccessTokenAPI = await this.get(url)
            if (res && res.access_token) {
                await this.setCache<WXAccessToken>('wx_access_token', { time: new Date(), token: res.access_token })
                return res.access_token
            } else throw new Error(`${res.errcode}:${res.errmsg}`)
        }
    },
    // use wechat API to filter sensitive content
    async wxFilterSensitive(content: string, replace: string = ''): Promise<string> {
        const accessToken = await this.getWxAccessToken()
        const url = `${WX_APP_MSG_CHECK}?access_token=${accessToken}`
        const res: WXSecCheckAPI = await this.post(url, { content })
        if (res.errcode === ERR_CODE) return replace
        return content
    },
    // use local json to filter sensitive content
    jsonFilterSensitive(content: string, replace: string = ''): string {
        return replace ? (filter.verify(content) ? content : replace) : filter.filter(content).text
    },
    // decrypt data from wechat phone API
    decryptData(encryptedData: string, iv: string, sessionKey: string, appid: string): WXDecodedData {
        // base64 decode
        const encryptedDataBuffer = Buffer.from(encryptedData, 'base64')
        const ivBuffer = Buffer.from(iv, 'base64')
        const sessionKeyBuffer = Buffer.from(sessionKey, 'base64')

        const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer)
        decipher.setAutoPadding(true)
        let decoded: string
        decoded = decipher.update(encryptedDataBuffer, undefined, 'utf8')
        decoded += decipher.final('utf8')
        const decodedData: WXDecodedData = JSON.parse(decoded)
        if (decodedData.watermark.appid !== appid) throw new Error('Invalid decrypted data')
        return decodedData
    },
    // count tokens in the text, by GPT2
    countTokens(text: string): number {
        return encode(text).length
    },
    subTokens(text: string, slice: number, from: number = 0) {
        const tokens = encode(text)
        const nTokens: number[] = []
        for (let i = from; i < tokens.length; i++) {
            if (nTokens.length >= slice) break
            nTokens.push(tokens[i])
        }
        return decode(nTokens)
    },
    async convertPDF(path: string) {
        return new Promise<string>((resolve, reject) => {
            libreoffice.convert(readFileSync(path), '.pdf', undefined, (err, data) => {
                if (err) reject(err)
                else {
                    path = path.replace(extname(path), '.pdf')
                    writeFileSync(path, data)
                    return resolve(path)
                }
            })
        })
    },
    // extract text from file buffer
    async extractContent(path: string) {
        const ext = extname(path)
        const office = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
        if (office.includes(ext)) path = await this.convertPDF(path)
        console.log(path)
        const content = (await pdf(readFileSync(path))).text
        return { ext, content }
    },
    tinyText(text: string): string {
        return text.replace(/[\n\r]{2,}/g, '\n').trim()
    },
    // split a long document text into pages by sentences
    splitPage(text: string, min: number = MIN_SPLIT_SIZE) {
        const paragraph = this.tinyText(text)
            .split(/[。？！]/g)
            .filter(s => s.trim().length > 0)
        let chunks: string[] = []
        for (const item of paragraph) chunks = chunks.concat(sentences(item))
        const arr: string[] = []
        let tmp: string = ''
        for (const item of chunks) {
            tmp += `${item} `
            if (this.countTokens(tmp) >= min) {
                arr.push(tmp.trim())
                tmp = ''
            }
        }
        if (tmp.length) arr.push(tmp.trim())
        return arr
    },
    checkPhone(num: string): boolean {
        const reg = /^1[3456789]{1}\d{9}$/
        return reg.test(num)
    },
    // upload to oss/cos
    async cosUpload(fileName: string, filePath: string) {
        return await cos.uploadFile({
            Bucket: COS_BUCKET,
            Region: COS_REGION,
            Key: fileName,
            FilePath: filePath
        })
    },
    // get redis cache
    async getCache<T>(key: string | number) {
        try {
            const value = await redis.get(key.toString())
            if (!value) return undefined
            return this.json<T>(value)
        } catch (e) {
            return undefined
        }
    },
    // set redis cache
    async setCache<T>(key: string | number, value: T, expire?: number) {
        if (expire) await redis.setex(key.toString(), expire, JSON.stringify(value))
        else await redis.set(key.toString(), JSON.stringify(value))
    },
    // set redis cache
    async removeCache(key: string | number) {
        await redis.del(key.toString())
        return undefined
    },
    json<T>(str: string) {
        try {
            return JSON.parse(str.trim()) as T
        } catch (e) {
            return undefined
        }
    },
    cosine(v1: number[], v2: number[]) {
        return similarity.cosine(v1, v2)
    },
    getGCD(a: number, b: number): number {
        if (b === 0) return a
        return this.getGCD(b, a % b)
    },
    getAspect(width: number, height: number) {
        if (!width || !height) return '1:1'

        const gcd = this.getGCD(width, height)
        const aspectRatioWidth = width / gcd
        const aspectRatioHeight = height / gcd

        return `${aspectRatioWidth}:${aspectRatioHeight}`
    }
}
