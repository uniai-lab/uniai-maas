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
import { GLMChatRoleEnum, GLMSubModel } from '@interface/Enum'
import { ChatResponse } from '@interface/controller/UniAI'
import $ from '@util/util'

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
        const data: ChatResponse = {
            content: '',
            model: '',
            object: '',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        }
        if (model === GLMSubModel.LOCAL) {
            const res = await $.post<GLMChatRequest, Readable | GLMChatResponse>(
                `${GLM_LOCAL_API}/chat`,
                { messages, stream, temperature, top_p: top, max_tokens: maxLength },
                { responseType: stream ? 'stream' : 'json' }
            )
            if (res instanceof Readable) {
                const output = new PassThrough()
                const parser = createParser(e => {
                    if (e.type === 'event') {
                        const obj = $.json<GLMChatStreamResponse>(e.data)
                        if (obj?.choices[0].delta?.content) {
                            data.content = obj.choices[0].delta.content
                            data.model = obj.model
                            data.object = obj.object
                            output.write(`data: ${JSON.stringify(data)}\n\n`)
                        }
                    }
                })
                res.on('data', (buff: Buffer) => parser.feed(buff.toString('utf-8')))
                res.on('error', e => output.destroy(e))
                res.on('end', () => output.end())
                res.on('close', () => parser.reset())
                return output as Readable
            } else {
                data.content = res.choices[0].message.content || ''
                data.model = res.model
                data.object = res.object
                data.promptTokens = res.usage?.prompt_tokens || 0
                data.completionTokens = res.usage?.completion_tokens || 0
                data.totalTokens = res.usage?.total_tokens || 0
                return data
            }
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
                        if (e.data) {
                            data.content = e.data
                            data.model = 'chatglm-turbo'
                            data.object = 'chat.completion.chunk'
                            output.write(`data: ${JSON.stringify(data)}\n\n`)
                        }
                    }
                })
                res.on('data', (buff: Buffer) => parser.feed(buff.toString('utf-8')))
                res.on('error', e => output.destroy(e))
                res.on('end', () => output.end())
                res.on('close', () => parser.reset())
                return output as Readable
            } else {
                // Check response
                if (res.code !== 200) throw new Error(res.msg)
                if (!res.data) throw new Error('Empty chat data response')

                data.content = res.data.choices[0].content.replace(/^"|"$/g, '').trim()
                data.model = 'chatglm-turbo'
                data.object = 'chat.completion'
                data.promptTokens = res.data.usage.prompt_tokens
                data.completionTokens = res.data.usage.completion_tokens
                data.totalTokens = res.data.usage.total_tokens
                return data
            }
        } else throw new Error('GLM sub model not found')
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
