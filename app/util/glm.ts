/**
 * Utility for connecting to the GLM model API.
 *
 * @format prettier
 * @author devilyouwei
 */

import { PassThrough, Readable } from 'stream'
import { createParser } from 'eventsource-parser'
import jwt from 'jsonwebtoken'

import {
    GLMChatRequest,
    GLMChatResponse,
    GLMEmbeddingRequest,
    GLMEmbeddingResponse,
    GLMChatMessage,
    GLMTurboChatRequest,
    GLMChatStreamResponse,
    GLMTurboChatResponse
} from '@interface/GLM'
import $ from '@util/util'
import { GLMChatRoleEnum, GLMSubModel } from '@interface/Enum'

const { GLM_LOCAL_API, GLM_REMOTE_API_KEY } = process.env
const EXPIRE_IN = 10 * 1000
const EMBED_MODEL = 'text2vec-large-chinese' // 'text2vec-base-chinese-paraphrase'
const GLM_REMOTE_API = 'https://open.bigmodel.cn'

export default {
    /**
     * Fetches embeddings for a prompt.
     *
     * @param prompt - An array of input prompts.
     * @returns A promise resolving to the embedding response.
     */
    async embedding(prompt: string[]) {
        return await $.post<GLMEmbeddingRequest, GLMEmbeddingResponse>(`${GLM_LOCAL_API}/embedding`, {
            prompt,
            model: EMBED_MODEL
        })
    },

    /**
     * Sends messages to the GLM chat model.
     *
     * @param model - The submodel to use for chat (default: GLM_DEFAULT_CHAT_MODEL).
     * @param messages - An array of chat messages.
     * @param stream - Whether to use stream response (default: false).
     * @param top - Top probability to sample (optional).
     * @param temperature - Temperature for sampling (optional).
     * @param maxLength - Maximum token length for response (optional).
     * @returns A promise resolving to the chat response or a stream.
     */
    async chat(
        model: GLMSubModel = GLMSubModel.TURBO,
        messages: GLMChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        if (model === GLMSubModel.LOCAL) {
            return await $.post<GLMChatRequest, Readable | GLMChatResponse>(
                `${GLM_LOCAL_API}/chat`,
                { messages, stream, temperature, top_p: top, max_tokens: maxLength },
                { responseType: stream ? 'stream' : 'json' }
            )
        } else if (model === GLMSubModel.TURBO) {
            // Recreate prompt for chatglm-turbo
            const prompt: GLMChatMessage[] = []
            let input = ''
            const { SYSTEM, USER, ASSISTANT } = GLMChatRoleEnum
            for (const { role, content } of messages) {
                if (role === USER || role === SYSTEM) input += `\n${content}`
                else {
                    prompt.push({ role: USER, content: input.trim() })
                    prompt.push({ role: ASSISTANT, content })
                    input = ''
                }
            }
            prompt.push({ role: USER, content: input.trim() })

            const invoke = stream ? 'sse-invoke' : 'invoke'
            const url = `${GLM_REMOTE_API}/api/paas/v3/model-api/chatglm_turbo/${invoke}`
            const token = generateToken(GLM_REMOTE_API_KEY, EXPIRE_IN)
            const res = await $.post<GLMTurboChatRequest, Readable | GLMTurboChatResponse>(
                url,
                { prompt, temperature, top_p: top },
                {
                    headers: { 'Content-Type': 'application/json', Authorization: token },
                    responseType: stream ? 'stream' : 'json'
                }
            )

            if (res instanceof Readable) {
                const output = new PassThrough()
                const parser = createParser(e => {
                    if (e.type === 'event') {
                        const content = e.data
                        const id = e.id || ''
                        const json: GLMChatStreamResponse = {
                            id,
                            model: 'chatglm-turbo',
                            object: 'chat.completion.chunk',
                            created: Date.now(),
                            choices: [{ delta: { content, role: 'assistant' }, finish_reason: 'stop', index: 0 }]
                        }
                        if (content) output.write(`data: ${JSON.stringify(json)}\n\n`)
                    }
                })
                res.on('data', (buff: Buffer) => parser.feed(buff.toString()))
                res.on('error', e => output.destroy(e))
                res.on('end', () => output.end())
                res.on('close', () => parser.reset())
                return output as Readable
            } else {
                // Check response
                if (res.code && res.code !== 200) throw new Error(res.msg)
                if (!res.data) throw new Error('Empty chat data response')

                const message = res.data.choices[0]
                message.content = message.content.replace(/^"|"$/g, '').trim()
                return {
                    id: '0',
                    model: 'chatglm-turbo',
                    object: 'chat.completion',
                    created: Date.now(),
                    choices: [{ message, index: 0, finish_reason: 'stop' }],
                    usage: res.data.usage
                } as GLMChatResponse
            }
        } else {
            throw new Error('GLM model not found')
        }
    }
}

/**
 * Generates a JWT token for authorization.
 *
 * @param key - The API key.
 * @param expire - Token expiration time in milliseconds.
 * @returns The generated JWT token.
 */
function generateToken(key: string, expire: number) {
    const [id, secret] = key.split('.')
    const timestamp = Date.now()
    // @ts-ignore
    const token: string = jwt.sign({ api_key: id, timestamp, exp: timestamp + expire }, secret, {
        header: { alg: 'HS256', sign_type: 'SIGN' }
    })
    return token
}
