/** @format */

import { Service } from 'egg'
import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import glm from '@util/glm'
import gpt from '@util/openai'

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Prompt extends Service {
    async outline(obj: {
        task: string
        role: string
        major: string
        topic: string
        language: string
        model: AIModelEnum
    }) {
        const { ctx } = this
        const content = `
            ${ctx.__('document language')} ${obj.language}
            ${ctx.__('task')}${obj.task}
            ${ctx.__('role')}${obj.role}
            ${ctx.__('major')}${obj.major}
            ${ctx.__('topic')}${obj.topic}
            ${ctx.__('prompt: document outline markdown')}`

        if (obj.model === 'GLM') return await glm.chat([{ role: 'user', content }], true)
        else return await gpt.chat([{ role: 'user', content }], true)
    }
}
