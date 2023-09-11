/**
 * @format
 * IFLYTEK API
 * 2023-9-8
 * devilyouwei
 */

import os from 'os'
import crypto from 'crypto'
import WebSocket from 'ws'
import { ChatCompletionRequestMessage } from 'openai'
import { PassThrough } from 'stream'
import $ from '@util/util'

// IFLYTEK spark model default API info
const API = process.env.SPARK_API
const API_KEY = process.env.SPARK_API_KEY
const API_SECRET = process.env.SPARK_API_SECRET
const APP_ID = process.env.SPARK_APP_ID
const VERSION = process.env.SPARK_API_VERSION

export default {
    async chat(
        messages: ChatCompletionRequestMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number,
        version: string = VERSION
    ) {
        const url = getURL(version)
        const ws = new WebSocket(url)
        let domain = 'general'
        if (version === 'v2.1') domain = 'generalv2'

        const input: SPKChatRequest = {
            header: { app_id: APP_ID },
            parameter: { chat: { domain, temperature, max_tokens: maxLength, top_k: top } },
            payload: { message: { text: messages } }
        }

        ws.on('open', () => ws.send(JSON.stringify(input)))

        if (stream) {
            const stream = new PassThrough()
            ws.on('error', e => stream.destroy(e))
            ws.on('message', (e: Buffer) => {
                try {
                    const res = $.json<SPKChatResponse>(e.toString())
                    if (!res) throw new Error('Response data is not JSON')
                    if (res.header.code !== 0) throw new Error(res.header.message)
                    res.payload.model = `spark-${version}`
                    res.payload.object = `chat.completion.chunk`
                    // simulate SSE data stream
                    stream.write(`data: ${JSON.stringify(res)}\n\n`)
                } catch (e) {
                    stream.end().destroy(e as Error)
                    ws.close()
                }
            })
            ws.on('close', () => stream.end().destroy())
            return stream
        } else {
            return new Promise<SPKChatResponse>((resolve, reject) => {
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
                    if (!res) return reject(new Error('response data is null'))
                    res.payload.model = `spark-${version}`
                    res.payload.object = `chat.completion`
                    resolve(res)
                })
            })
        }
    }
}

function getURL(version: string) {
    const host = os.hostname()
    console.log(host)
    const date = new Date().toUTCString()
    const algorithm = 'hmac-sha256'
    const headers = 'host date request-line'
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /${version}/chat HTTP/1.1`
    const signatureSha = crypto.createHmac('sha256', API_SECRET).update(signatureOrigin).digest('hex')
    const signature = Buffer.from(signatureSha, 'hex').toString('base64')
    const authorizationOrigin = `api_key="${API_KEY}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
    const authorization = Buffer.from(authorizationOrigin).toString('base64')
    return `${API}/${version}/chat?authorization=${authorization}&date=${date}&host=${host}`
}

// spark chat model request interface
interface SPKChatRequest {
    header: {
        app_id: string
        uid?: string
    }
    parameter: {
        chat: {
            domain: string
            temperature?: number
            max_tokens?: number
            top_k?: number
            chat_id?: number
        }
    }
    payload: {
        message: {
            text: ChatCompletionRequestMessage[]
        }
    }
}

export interface SPKChatResponse {
    header: {
        code: number
        message: string
        sid: string
        status: number
    }
    payload: {
        choices: {
            status: number
            seq: number
            text: [
                {
                    content: string
                    role: string
                    index: number
                }
            ]
        }
        usage?: {
            text: {
                question_tokens: number
                prompt_tokens: number
                completion_tokens: number
                total_tokens: number
            }
        }
        model?: string
        object?: string
    }
}
