/**
 * IFLYTEK API utility for chat.
 *
 * @format
 * @date 2023-9-8
 * @author devilyouwei
 */

import os from 'os'
import { createHmac } from 'crypto'
import WebSocket from 'ws'
import { PassThrough, Readable } from 'stream'
import { SPKChatMessage, SPKChatRequest, SPKChatResponse } from '@interface/Spark'
import { SPKSubModel, SPKSubModelDomain } from '@interface/Enum'
import $ from '@util/util'

const { SPARK_API, SPARK_API_KEY, SPARK_API_SECRET, SPARK_APP_ID, SPARK_DEFAULT_MODEL_VERSION } = process.env

export default {
    /**
     * Initiates a chat conversation with IFLYTEK Spark API.
     *
     * @param messages - An array of chat messages.
     * @param stream - Whether to use stream response (default: false).
     * @param top - Top probability to sample (optional).
     * @param temperature - Temperature for sampling (optional).
     * @param maxLength - Maximum token length for response (optional).
     * @param version - The Spark model version to use (default: SPARK_DEFAULT_MODEL_VERSION).
     * @returns A promise resolving to the chat response or a stream.
     */
    chat(
        messages: SPKChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number,
        version: SPKSubModel = SPARK_DEFAULT_MODEL_VERSION
    ) {
        const url = getURL(version)
        const ws = new WebSocket(url)

        const domain = SPKSubModelDomain[version]

        const input: SPKChatRequest = {
            header: { app_id: SPARK_APP_ID },
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
                    res.payload.model = `spark-${version}`
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
                    res.payload.model = `spark-${version}`
                    res.payload.object = `chat.completion`
                    resolve(res)
                })
            }
        })
    }
}

/**
 * Generates the WebSocket URL for the Spark API request.
 *
 * @param version - The Spark model version.
 * @returns The WebSocket URL.
 */
function getURL(version: string) {
    const host = os.hostname()
    const date = new Date().toUTCString()
    const algorithm = 'hmac-sha256'
    const headers = 'host date request-line'
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /${version}/chat HTTP/1.1`
    const signatureSha = createHmac('sha256', SPARK_API_SECRET).update(signatureOrigin).digest('hex')
    const signature = Buffer.from(signatureSha, 'hex').toString('base64')
    const authorizationOrigin = `api_key="${SPARK_API_KEY}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
    const authorization = Buffer.from(authorizationOrigin).toString('base64')
    return `${SPARK_API}/${version}/chat?authorization=${authorization}&date=${date}&host=${host}`
}
