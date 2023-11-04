/** @format */

import { AIModelEnum } from '@interface/Enum'

// for env file
export {}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // APP info
            APP_NAME: string
            APP_URL: string
            DEFAULT_AVATAR_AI: string
            DEFAULT_AVATAR_USER: string
            DEFAULT_USERNAME: string
            ADMIN_TOKEN: string

            // OpenAI GPT
            OPENAI_API: string
            OPENAI_API_VERSION: string
            OPENAI_API_KEY: string
            OPENAI_EMBED_DIM: number
            OPENAI_DEFAULT_CHAT_MODEL: string
            OPENAI_DEFAULT_EMBED_MODEL: string

            // GLM
            GLM_API: string
            TEXT2VEC_EMBED_DIM: number

            // Spark
            SPARK_API: string
            SPARK_API_KEY: string
            SPARK_API_SECRET: string
            SPARK_APP_ID: string
            SPARK_DEFAULT_MODEL_VERSION: string

            // stable diffusion
            STABLE_DIFFUSION_API: string

            // mid journey
            MID_JOURNEY_API: string
            MID_JOURNEY_TOKEN: string

            // DB postgresSQL
            POSTGRES_HOST: string
            POSTGRES_PORT: string
            POSTGRES_USER: string
            POSTGRES_PASSWORD: string
            POSTGRES_DB: string

            // cache redis
            REDIS_PORT: number
            REDIS_HOST: string

            // wechat API
            WX_APP_ID: string
            WX_APP_SECRET: string
            WX_APP_AUTH_URL: string
            WX_APP_ACCESS_TOKEN_URL: string
            WX_APP_PHONE_URL: string
            WX_APP_MSG_CHECK: string
            WX_DEFAULT_CHAT_MODEL: AIModelEnum
            WX_DEFAULT_RESOURCE_MODEL: AIModelEnum
            WX_DEFAULT_EMBED_MODEL: AIModelEnum

            // tencent oss
            COS_SECRET_ID: string
            COS_SECRET_KEY: string
            COS_BUCKET: string
            COS_REGION: string

            // google search
            GOOGLE_SEARCH_API_TOKEN: string
            GOOGLE_SEARCH_ENGINE_ID: string
        }
    }
}
