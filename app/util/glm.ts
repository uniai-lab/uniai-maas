/**
 * util for GLM model API connect
 *
 * @format
 * @devilyouwei
 */

import { PassThrough, Stream } from 'stream'
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
import { GLMChatRoleEnum } from '@interface/Enum'

const { GLM_API, GLM_API_KEY, GLM_API_REMOTE, GLM_DEFAULT_CHAT_MODEL } = process.env

export default {
    async embedding(prompt: string[]) {
        return await $.post<GLMEmbeddingRequest, GLMEmbeddingResponse>(`${GLM_API}/embedding`, { prompt })
    },
    async chat(
        messages: GLMChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number,
        subModel: string = GLM_DEFAULT_CHAT_MODEL
    ) {
        if (subModel === 'chatglm3-6b-32k') {
            return await $.post<GLMChatRequest, Stream | GLMChatResponse>(
                `${GLM_API}/chat`,
                { messages, stream, temperature, top_p: top, max_tokens: maxLength },
                { responseType: stream ? 'stream' : 'json' }
            )
        } else if (subModel === 'chatglm-turbo') {
            // recreate prompt for chatglm-turbo
            const prompt: GLMChatMessage[] = []
            let input = ''
            const { SYSTEM, USER, ASSISTANT } = GLMChatRoleEnum
            for (const { role, content } of messages)
                if (role === SYSTEM) {
                    prompt.push({ role: USER, content })
                    prompt.push({ role: ASSISTANT, content: 'Yes' })
                } else if (role === USER) input += `\n${content}`
                else {
                    prompt.push({ role: USER, content: input.trim() })
                    prompt.push({ role: ASSISTANT, content })
                    input = ''
                }
            prompt.push({ role: USER, content: input.trim() })

            const invoke = stream ? 'sse-invoke' : 'invoke'
            const url = `${GLM_API_REMOTE}/api/paas/v3/model-api/chatglm_turbo/${invoke}`
            const token = generateToken(GLM_API_KEY, 60 * 1000)
            const res = await $.post<GLMTurboChatRequest, Stream | GLMTurboChatResponse>(
                url,
                { prompt, temperature, top_p: top },
                {
                    headers: { 'Content-Type': 'application/json', Authorization: token },
                    responseType: stream ? 'stream' : 'json'
                }
            )

            if (res instanceof Stream) {
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
                return output
            } else {
                // check res
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
        } else throw new Error('GLM model not found')
    }
}

// expiresIn: milliseconds
function generateToken(apiKey: string, expiresIn: number) {
    const [id, secret] = apiKey.split('.')

    // @ts-ignore
    return jwt.sign(
        {
            api_key: id,
            exp: Date.now() + expiresIn,
            timestamp: Date.now()
        },
        secret,
        {
            header: {
                alg: 'HS256',
                sign_type: 'SIGN'
            }
        }
    )
}
