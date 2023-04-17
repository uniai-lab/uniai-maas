/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai'
import glm from '@util/glm'
import gpt from '@util/openai'

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class UniAI extends Service {
    // add a new user
    async chat(prompts: ChatCompletionRequestMessage[], model: AIModelEnum = 'GLM', stream: boolean = false) {
        if (stream) {
        } else {
            if (model === 'GPT') return await gpt.chat<CreateChatCompletionResponse>(prompts)
            if (model === 'GLM') return await glm.chat<GLMChatResponse>(prompts)
        }
    }
}
