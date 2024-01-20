/** @format */

import { HTTPController, HTTPMethod, HTTPMethodEnum, Context, EggContext, HTTPBody, Middleware } from '@eggjs/tegg'
import { ChatRoleEnum } from '@interface/Enum'
import { AddPromptRequest, AddPromptResponse } from '@interface/controller/Agent'
import auth from '@middleware/authB'

@HTTPController({ path: '/agent' })
export default class Agent {
    @Middleware(auth())
    @HTTPMethod({ path: '/add-prompt', method: HTTPMethodEnum.POST })
    async add(@Context() ctx: EggContext, @HTTPBody() params: AddPromptRequest) {
        const { id, typeId, role, content } = params
        if (!Object.values<ChatRoleEnum>(ChatRoleEnum).includes(role)) throw new Error('Can not find the role')
        if (!content.trim()) throw new Error('Content can not be empty')

        const res = await ctx.service.agent.addPrompt(role, content, 0, typeId, id)
        const data: AddPromptResponse = {
            id: res.id,
            typeId: res.typeId,
            role: res.role,
            content: res.content,
            userId: res.userId,
            tokens: res.tokens
        }
        ctx.service.res.success('Success to update prompt', data)
    }
}
