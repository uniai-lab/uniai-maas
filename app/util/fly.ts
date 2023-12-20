/**
 * IFLYTEK API utility for chat.
 *
 * @format
 * @date 2023-9-8
 * @author devilyouwei
 */

import os from 'os'
import { createHmac, randomUUID } from 'crypto'
import WebSocket from 'ws'
import { PassThrough, Readable } from 'stream'
import {
    FlyAuditParams,
    FlyAuditRequest,
    FlyAuditResponse,
    SPKChatMessage,
    SPKChatRequest,
    SPKChatResponse
} from '@interface/Spark'
import { FLYAuditType, SPKChatRoleEnum, SPKSubModel, SPKSubModelDomain } from '@interface/Enum'
import $ from '@util/util'
import moment from 'moment'

const { FLY_API_KEY, FLY_APP_ID, FLY_API_SECRET } = process.env

const SPARK_API = 'ws://spark-api.xf-yun.com'
const AUDIT_API = 'https://audit.iflyaisol.com'

export default {
    /**
     * Initiates a chat conversation with IFLYTEK Spark API.
     *
     * @param model - The Spark model version to use (default: SPARK_DEFAULT_MODEL_VERSION).
     * @param messages - An array of chat messages.
     * @param stream - Whether to use stream response (default: false).
     * @param top - Top probability to sample (optional).
     * @param temperature - Temperature for sampling (optional).
     * @param maxLength - Maximum token length for response (optional).
     * @returns A promise resolving to the chat response or a stream.
     */
    chat(
        model: SPKSubModel,
        messages: SPKChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        for (const i in messages)
            if (!Object.values(SPKChatRoleEnum).includes(messages[i].role)) messages[i].role = SPKChatRoleEnum.USER
        console.log(messages)
        const url = getSparkURL(model)
        const ws = new WebSocket(url)

        const domain = SPKSubModelDomain[model]

        const input: SPKChatRequest = {
            header: { app_id: FLY_APP_ID },
            parameter: { chat: { domain, temperature, max_tokens: maxLength, top_k: top } },
            payload: { message: { text: messages } }
        }

        ws.on('open', () => ws.send(JSON.stringify(input)))

        return new Promise<SPKChatResponse | Readable>((resolve, reject) => {
            if (stream) {
                const stream = new PassThrough()
                ws.on('message', (e: Buffer) => {
                    const res = $.json<SPKChatResponse>(e.toString('utf8'))
                    if (!res) return stream.destroy(new Error('Response data is not JSON'))
                    if (res.header.code !== 0) return stream.destroy(new Error(res.header.message))

                    // Simulate SSE data stream
                    res.payload.model = `spark-${model}`
                    res.payload.object = `chat.completion.chunk`
                    stream.write(`data: ${JSON.stringify(res)}\n\n`)
                })
                ws.on('error', e => stream.destroy(e))
                ws.on('close', () => stream.end())
                resolve(stream as Readable)
            } else {
                let res: SPKChatResponse | null = null
                ws.on('error', e => reject(e))
                ws.on('message', (e: Buffer) => {
                    const data = $.json<SPKChatResponse>(e.toString('utf8'))
                    if (!data) return reject(new Error('Response data is not JSON'))
                    if (data.header.code !== 0) return reject(new Error(data.header.message))
                    if (res) {
                        res.payload.choices.text[0].content += data.payload.choices.text[0].content
                        res.payload.usage = data.payload.usage
                    } else res = data
                })
                ws.on('close', () => {
                    if (!res) return reject(new Error('Response data is null'))
                    res.payload.model = `spark-${model}`
                    res.payload.object = `chat.completion`
                    resolve(res)
                })
            }
        })
    },
    // use iFlyTek Audit API to audit text and image
    // input content for image is file base64
    async audit(content: string) {
        const type: FLYAuditType = $.isBase64(content) ? FLYAuditType.IMAGE : FLYAuditType.TEXT
        const url = getAuditURL(type)
        const res = await $.post<FlyAuditRequest, FlyAuditResponse>(url, {
            content,
            is_match_all: 0,
            categories: ['pornDetection', 'violentTerrorism', 'political', 'contraband']
        })
        return { flag: res.code === '000000' && res.data.result.suggest === 'pass', data: res }
    }
}

/**
 * Generates the WebSocket URL for the Spark API request.
 *
 * @param version - The Spark model version.
 * @returns The WebSocket URL.
 */
function getSparkURL(version: SPKSubModel) {
    const host = os.hostname()
    const date = new Date().toUTCString()
    const algorithm = 'hmac-sha256'
    const headers = 'host date request-line'
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /${version}/chat HTTP/1.1`
    const signatureSha = createHmac('sha256', FLY_API_SECRET).update(signatureOrigin).digest('hex')
    const signature = Buffer.from(signatureSha, 'hex').toString('base64')
    const authorizationOrigin = `api_key="${FLY_API_KEY}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
    const authorization = Buffer.from(authorizationOrigin).toString('base64')
    return `${SPARK_API}/${version}/chat?authorization=${authorization}&date=${date}&host=${host}`
}

/**
 * Generates the URL for the iFlyTek audit request.
 *
 * @param type - The type of content to be audit, e.g., IMAGE, TEXT, AUDIO, VIDEO
 * @returns The URL for the audit request.
 */
function getAuditURL(type: FLYAuditType) {
    // 生成 UTC 时间和 UUID
    const utc = moment().utc(true).format('YYYY-MM-DD[T]HH:mm:ss[+0000]')
    const uuid = randomUUID()

    // 1. 生成 Base String
    const params: FlyAuditParams = {
        accessKeyId: FLY_API_KEY,
        accessKeySecret: FLY_API_SECRET,
        appId: FLY_APP_ID,
        utc: encodeURIComponent(utc),
        uuid: encodeURIComponent(uuid)
    }
    if (type === FLYAuditType.IMAGE) params.modeType = 'base64'

    const baseString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&')

    // 2. 生成 Signature
    const signature = createHmac('sha1', FLY_API_SECRET).update(baseString).digest('base64')

    // 3. 构造最终的 URL
    return `${AUDIT_API}/audit/v2/${type}?${baseString}&signature=${encodeURIComponent(signature)}`
}
