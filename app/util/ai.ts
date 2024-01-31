/** @format */

import UniAI, { ModelProvider, ChatModel, ChatMessage, EmbedModel } from 'uniai'

const {
    OPENAI_API,
    OPENAI_KEY,
    GOOGLE_AI_API,
    GOOGLE_AI_KEY,
    ZHIPU_AI_KEY,
    GLM_API,
    FLY_API_KEY,
    FLY_API_SECRET,
    FLY_APP_ID,
    BAIDU_API_KEY,
    BAIDU_SECRET_KEY,
    MOONSHOT_KEY
} = process.env

const ai = new UniAI({
    OpenAI: {
        key: OPENAI_KEY.split(','),
        proxy: OPENAI_API
    },
    Google: {
        key: GOOGLE_AI_KEY.split(','),
        proxy: GOOGLE_AI_API
    },
    GLM: {
        key: ZHIPU_AI_KEY.split(','),
        local: GLM_API
    },
    IFlyTek: {
        apiKey: FLY_API_KEY,
        apiSecret: FLY_API_SECRET,
        appId: FLY_APP_ID
    },
    Baidu: {
        apiKey: BAIDU_API_KEY,
        secretKey: BAIDU_SECRET_KEY
    },
    MoonShot: {
        key: MOONSHOT_KEY.split(',')
    },
    Other: {
        api: GLM_API
    }
})
export default {
    async chat(
        messages: ChatMessage[],
        provider?: ModelProvider,
        model?: ChatModel,
        stream?: boolean,
        top?: number,
        temperature?: number,
        maxLength?: number
    ) {
        return await ai.chat(messages, { provider, model, stream, top, temperature, maxLength })
    },
    async embed(text: string[], provider: ModelProvider = ModelProvider.Other, model?: EmbedModel) {
        return await ai.embedding(text, { provider, model })
    },
    list() {
        return ai.models
    }
}
