/** @format */
// for env file
export {}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            APP_NAME: string
            URL: string
            OPENAI_API: string
            OPENAI_API_KEY: string
            OPENAI_EMBED_DIM: number
            GLM_API: string
            GLM_EMBED_DIM: number
            SPARK_API: string
            SPARK_API_KEY: string
            SPARK_API_SECRET: string
            SPARK_APP_ID: string
            SPARK_API_VERSION: string
            STABLE_DIFFUSION_API: string
            POSTGRES_HOST: string
            POSTGRES_PORT: number
            POSTGRES_USER: string
            POSTGRES_PASSWORD: string
            POSTGRES_DB: string
            REDIS_PORT: number
            WX_APP_ID: string
            WX_APP_SECRET: string
            WX_APP_AUTH_URL: string
            WX_APP_ACCESS_TOKEN_URL: string
            WX_APP_PHONE_URL: string
            WX_APP_MSG_CHECK: string
            DEFAULT_AVATAR_AI: string
            DEFAULT_AVATAR_USER: string
            DEFAULT_USERNAME: string
            COS_SECRET_ID: string
            COS_SECRET_KEY: string
            COS_BUCKET: string
            COS_REGION: string
            ADMIN_TOKEN: string
            GOOGLE_SEARCH_API_TOKEN: string
            GOOGLE_SEARCH_ENGINE_ID: string
        }
    }
}
