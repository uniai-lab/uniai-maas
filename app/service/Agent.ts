/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { ChatRoleEnum } from '@interface/Enum'
import { Service } from 'egg'
import promptType from '@data/promptType'
import $ from '@util/util'

const DEFAULT_PROMPT_TYPE = promptType[0].id

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
}
