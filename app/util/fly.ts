/**
 * IFLYTEK API utility for chat.
 *
 * @format
 * @date 2023-9-8
 * @author devilyouwei
 */

import WebSocket from 'ws'
import moment from 'moment'
import { hostname } from 'os'
import { createHmac, randomUUID } from 'crypto'
import { PassThrough, Readable } from 'stream'
import {
    FlyAuditParams,
    FlyAuditRequest,
    FlyAuditResponse,
    SPKChatMessage,
    SPKChatRequest,
    SPKChatResponse
} from '@interface/Spark'
import { FLYAuditType, SPKChatRoleEnum, FlyChatModel, FlyChatDomain, ChatRoleEnum } from '@interface/Enum'
import { ChatMessage, ChatResponse } from '@interface/controller/UniAI'
import $ from '@util/util'

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
        model: FlyChatModel = FlyChatModel.V3,
        messages: ChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        // get specific generated URL
        const url = getSparkURL(model)
        const ws = new WebSocket(url)

        // top is integer in [1,6]
        if (typeof top === 'number') {
            top = Math.floor(top * 10)
            top = top < 1 ? 1 : top
            top = top > 6 ? 6 : top
        }
        const input: SPKChatRequest = {
            header: { app_id: FLY_APP_ID },
            parameter: { chat: { domain: FlyChatDomain[model], temperature, max_tokens: maxLength, top_k: top } },
            payload: { message: { text: formatMessage(messages) } }
        }

        return new Promise<ChatResponse | Readable>((resolve, reject) => {
            const data: ChatResponse = {
                content: '',
                model: `spark-${model}`,
                object: '',
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
            }
            ws.on('open', () => ws.send(JSON.stringify(input)))
            if (stream) {
                // transfer to SSE data stream
                const output = new PassThrough()
                ws.on('message', (e: Buffer) => {
                    const res = $.json<SPKChatResponse>(e.toString('utf-8'))
                    if (!res) return output.destroy(new Error('Response data is not JSON'))

                    if (res.header.code === 0 && res.payload) {
                        data.content = res.payload.choices.text[0].content
                        data.promptTokens = res.payload?.usage?.text.prompt_tokens || 0
                        data.completionTokens = res.payload?.usage?.text.completion_tokens || 0
                        data.totalTokens = res.payload?.usage?.text.total_tokens || 0
                        data.object = `chat.completion.chunk`
                        output.write(JSON.stringify(data))
                    } else {
                        output.destroy(new Error(res.header.message))
                        ws.close()
                    }

                    if (res.header.status === 2) ws.close()
                })
                ws.on('close', () => output.end())
                ws.on('error', e => output.destroy(e))
                resolve(output as Readable)
            } else {
                ws.on('message', (e: Buffer) => {
                    const res = $.json<SPKChatResponse>(e.toString('utf-8'))
                    if (!res) return reject(new Error('Response data is not JSON'))

                    if (res.header.code === 0 && res.payload) {
                        data.content += res.payload.choices.text[0].content
                        data.promptTokens = res.payload.usage?.text.prompt_tokens || 0
                        data.completionTokens = res.payload.usage?.text.completion_tokens || 0
                        data.totalTokens = res.payload.usage?.text.total_tokens || 0
                        data.object = `chat.completion`
                    } else {
                        reject(new Error(res.header.message))
                        ws.close()
                    }

                    if (res.header.status === 2) ws.close()
                })
                ws.on('close', () => resolve(data))
                ws.on('error', e => reject(e))
            }
        })
    },

    // use iFlyTek Audit API to audit text and image
    // input content for image is file base64
    async audit(content: string) {
        const type: FLYAuditType = $.isBase64(content) ? FLYAuditType.IMAGE : FLYAuditType.TEXT
        const url = getAuditURL(type)
        return await $.post<FlyAuditRequest, FlyAuditResponse>(url, {
            content,
            is_match_all: 0,
            categories: ['pornDetection', 'violentTerrorism', 'political', 'contraband']
        })
    }
}

/**
 * Generates the WebSocket URL for the Spark API request.
 *
 * @param version - The Spark model version.
 * @returns The WebSocket URL.
 */
function getSparkURL(version: FlyChatModel) {
    const host = hostname()
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

function formatMessage(messages: ChatMessage[]) {
    const prompt: SPKChatMessage[] = []
    let input = ''
    for (const { role, content } of messages) {
        if (!content) continue
        if (role !== ChatRoleEnum.ASSISTANT) input += `\n${content}`
        else {
            prompt.push({ role: SPKChatRoleEnum.USER, content: input.trim() || ' ' })
            prompt.push({ role: SPKChatRoleEnum.ASSISTANT, content })
            input = ''
        }
    }
    if (!input.trim()) throw new Error('User input nothing')
    prompt.push({ role: SPKChatRoleEnum.USER, content: input.trim() })
    return prompt
}
