/** @format */

import { ChatRoleEnum, GEMChatRoleEnum, GoogleChatModel } from '@interface/Enum'
import { GEMChatMessage, GEMChatRequest, GEMChatResponse } from '@interface/Google'
import { ChatMessage, ChatResponse } from '@interface/controller/UniAI'
import { JSONParser } from '@streamparser/json-node'
import { decodeStream } from 'iconv-lite'
import { PassThrough, Readable } from 'stream'
import $ from '@util/util'

const { GOOGLE_AI_KEY } = process.env
const API = 'https://generativelanguage.googleapis.com'
const SAFE_SET = [
    {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE'
    },
    {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE'
    },
    {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE'
    },
    {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE'
    }
]

export default {
    /**
     * Sends messages to the Google Gemini chat model.
     *
     * @param model - The model to use for chat (default: gemini-pro).
     * @param messages - An array of chat messages.
     * @param stream - Whether to use stream response (default: false).
     * @param top - Top probability to sample (optional).
     * @param temperature - Temperature for sampling (optional).
     * @param maxLength - Maximum token length for response (optional).
     * @returns A promise resolving to the chat response or a stream.
     */
    async chat(
        model: GoogleChatModel = GoogleChatModel.GEM_PRO,
        messages: ChatMessage[],
        stream: boolean = false,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        const res = await $.post<GEMChatRequest, GEMChatResponse | Readable>(
            `${API}/v1beta/models/${model}:${stream ? 'streamGenerateContent' : 'generateContent'}?key=${GOOGLE_AI_KEY}`,
            {
                contents: formatMessage(messages),
                generationConfig: { topP: top, temperature, maxOutputTokens: maxLength },
                safetySettings: SAFE_SET
            },
            { responseType: stream ? 'stream' : 'json' }
        )
        const data: ChatResponse = {
            content: '',
            model,
            object: '',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        }
        if (res instanceof Readable) {
            const output = new PassThrough()
            const parser = new JSONParser({ stringBufferSize: undefined })

            parser.on('data', ({ value }) => {
                console.log(JSON.stringify(value))
                if (value.candidates || value.promptFeedback) {
                    const obj = value as GEMChatResponse
                    const block = obj.promptFeedback?.blockReason
                    if (block) output.destroy(new Error(block))
                    else {
                        const content = obj.candidates![0].content?.parts[0].text || ''
                        if (content) data.content = content
                        else data.content = obj.candidates![0].finishReason || 'Error'
                        data.object = `chat.completion.chunk`
                        output.write(JSON.stringify(data))
                    }
                }
            })

            parser.on('error', e => output.destroy(e))
            parser.on('end', () => output.end())

            res.pipe(decodeStream('utf-8')).pipe(parser)
            return output
        } else {
            const block = res.promptFeedback?.blockReason
            if (block) throw new Error(block)
            const candidate = res.candidates![0]
            data.content = candidate.content!.parts[0].text || candidate.finishReason
            data.object = `chat.completion`
            return data
        }
    }
}

/**
 * Formats chat messages into GEMChatMessage format.
 *
 * @param messages - An array of chat messages.
 * @returns A formatted array of GEMChatMessage.
 */
function formatMessage(messages: ChatMessage[]) {
    const prompt: GEMChatMessage[] = []
    let input = ''
    for (const { role, content } of messages) {
        if (!content) continue
        if (role !== ChatRoleEnum.ASSISTANT) input += `\n${content}`
        else {
            prompt.push({ role: GEMChatRoleEnum.USER, parts: [{ text: input.trim() || ' ' }] })
            prompt.push({ role: GEMChatRoleEnum.MODEL, parts: [{ text: content }] })
            input = ''
        }
    }
    if (!input.trim()) throw new Error('User input nothing')
    prompt.push({ role: GEMChatRoleEnum.USER, parts: [{ text: input.trim() }] })
    console.log(JSON.stringify(prompt))
    return prompt
}
