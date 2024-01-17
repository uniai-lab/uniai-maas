/**
 * Utility for connecting to the GLM model API.
 *
 * @format prettier
 * @author devilyouwei
 */

import { PassThrough, Readable } from 'stream'
import { createParser } from 'eventsource-parser'
import jwt from 'jsonwebtoken'
import { tmpdir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

import {
    GLMChatRequest,
    GLMChatResponse,
    GLMEmbeddingRequest,
    GLMEmbeddingResponse,
    GLMChatMessage,
    GLMTurboChatRequest,
    GLMChatStreamResponse,
    GLMTurboChatResponse,
    TokenCache
} from '@interface/GLM'
import { GLMChatRoleEnum, GLMChatModel, TextVecEmbedModel } from '@interface/Enum'
import { ChatResponse } from '@interface/controller/UniAI'
import $ from '@util/util'

const { GLM_LOCAL_API, GLM_REMOTE_API_KEY } = process.env
const GLM_REMOTE_API = 'https://open.bigmodel.cn'
const EXPIRE_IN = 7 * 24 * 60 * 60 * 1000

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
            model: TextVecEmbedModel.LARGE_CHN
        })
    },

    /**
     * Sends messages to the GLM chat model.
     *
     * @param model - The submodel to use for chat (default: LOCAL chatglm3-6b-32k).
     * @param messages - An array of chat messages.
     * @param stream - Whether to use stream response (default: false).
     * @param top - Top probability to sample (optional).
     * @param temperature - Temperature for sampling (optional).
     * @param maxLength - Maximum token length for response (optional).
     * @returns A promise resolving to the chat response or a stream.
     */
    async chat(
        model: GLMChatModel = GLMChatModel.LOCAL,
        messages: GLMChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        const data: ChatResponse = {
            content: '',
            model,
            object: '',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        }
        if (model === GLMChatModel.LOCAL) {
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
                data.object = res.object
                data.promptTokens = res.usage?.prompt_tokens || 0
                data.completionTokens = res.usage?.completion_tokens || 0
                data.totalTokens = res.usage?.total_tokens || 0
                return data
            }
        } else if (model === GLMChatModel.TURBO) {
            const invoke = stream ? 'sse-invoke' : 'invoke'
            const url = `${GLM_REMOTE_API}/api/paas/v3/model-api/chatglm_turbo/${invoke}`
            const token = generateToken(GLM_REMOTE_API_KEY, EXPIRE_IN)
            const res = await $.post<GLMTurboChatRequest, Readable | GLMTurboChatResponse>(
                url,
                { prompt: formatMessage(messages), temperature, top_p: top },
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
                data.object = 'chat.completion'
                data.promptTokens = res.data.usage.prompt_tokens
                data.completionTokens = res.data.usage.completion_tokens
                data.totalTokens = res.data.usage.total_tokens
                return data
            }
        } else throw new Error('GLM chat model not found')
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
    const filepath = join(tmpdir(), 'glm_access_token.json')
    const now = Date.now()
    if (existsSync(filepath)) {
        const cache = $.json<TokenCache>(readFileSync(filepath, 'utf8'))
        if (cache && cache.expire > now) return cache.token
    }
    // @ts-ignore
    const token: string = jwt.sign({ api_key: id, now, exp: now + expire }, secret, {
        header: { alg: 'HS256', sign_type: 'SIGN' }
    })
    writeFileSync(filepath, JSON.stringify({ token, expire: now + expire } as TokenCache))
    return token
}

function formatMessage(messages: GLMChatMessage[]) {
    // Recreate prompt for chatglm-turbo
    const prompt: GLMChatMessage[] = []
    let input = ''
    const { USER, ASSISTANT } = GLMChatRoleEnum
    for (const { role, content } of messages) {
        if (role !== ASSISTANT) input += `\n${content}`
        else {
            prompt.push({ role: USER, content: input.trim() || 'None' })
            prompt.push({ role: ASSISTANT, content })
            input = ''
        }
    }
    prompt.push({ role: USER, content: input.trim() || 'None' })
    return prompt
}
