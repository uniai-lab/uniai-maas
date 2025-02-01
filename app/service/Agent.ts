/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import promptType from '@data/promptType'
import { ChatModel, ChatModelProvider, ChatResponse, ChatRoleEnum } from 'uniai'
import { OutputMode } from '@interface/Enum'
import $ from '@util/util'

const DEFAULT_PROMPT_TYPE = promptType[0].id
const DEFAULT_PROVIDER = ChatModelProvider.Other
const JSON_REGEX = /^```json\s*|```$/gm

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Agent extends Service {
    // get user info
    async addPrompt(role: ChatRoleEnum, content: string, userId: number, typeId?: number, id?: number) {
        const { ctx } = this
        const tokens = $.countTokens(content)
        if (id) {
            const prompt = await ctx.model.Prompt.findByPk(id)
            if (!prompt) throw new Error('Can not find the prompt by id')
            prompt.role = role
            prompt.content = content
            prompt.tokens = tokens
            if (typeId) prompt.typeId = typeId
            return await prompt.save()
        } else {
            typeId = typeId || DEFAULT_PROMPT_TYPE
            return await ctx.model.Prompt.create({ role, content, tokens, userId, typeId })
        }
    }

    // use output mode
    async useOutputMode(input: string, provider: ChatModelProvider = DEFAULT_PROVIDER, model?: ChatModel) {
        const { ctx } = this
        let prompt = `根据用户输入内容判断其目的是？\n`
        prompt += `1. 进行文本回复\n`
        prompt += `2. 生成数据可视化图表，如折线图、饼图、柱状图、雷达图等\n`
        prompt += `3. 生成图片、绘画（注意：不包含图表）\n`
        prompt += `以下是用户输入的内容：${input}\n请判断属于以上哪一种目的。\n`
        prompt += `【重要】以JSON格式返回，JSON数据结构如下：\n`
        prompt += `{ "mode": 1 } \n`
        prompt += `mode值为：1、2、3，对应上述3种目的类别。\n`

        console.log('Agent useOutputMode>>>', prompt)
        const { content } = (await ctx.service.uniAI.chat(prompt, false, provider, model, 0, 0)) as ChatResponse
        console.log('Agent useOutputMode<<<', content)

        return $.jsonFix<{ mode: OutputMode }>(content!.replace(JSON_REGEX, ''))?.mode || OutputMode.TEXT
    }

    async translateImagine(input: string, provider: ChatModelProvider = DEFAULT_PROVIDER, model?: ChatModel) {
        const prompt = `以下是一段用于生成图片的提示词，请优化提示词内容并翻译为英文输出：${input}`
        console.log('Agent translateImagine>>>', prompt)
        const { content } = (await this.ctx.service.uniAI.chat(prompt, false, provider, model)) as ChatResponse
        console.log('Agent translateImagine<<<', content)
        return content!
    }
}
