/** @format */

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // initial admin token
            ADMIN_TOKEN: string

            OPENAI_API: string
            OPENAI_KEY: string
            GOOGLE_AI_API: string
            GOOGLE_AI_KEY: string
            ZHIPU_AI_API: string
            ZHIPU_AI_KEY: string
            FLY_APP_ID: string
            FLY_API_KEY: string
            FLY_API_SECRET: string
            BAIDU_API: string
            BAIDU_API_KEY: string
            BAIDU_SECRET_KEY: string
            MOONSHOT_API: string
            MOONSHOT_KEY: string
            STABLE_DIFFUSION_API: string
            MID_JOURNEY_API: string
            MID_JOURNEY_TOKEN: string
            OTHER_API: string
            GLM_API: string

            // select a database
            DB_DIALECT: string

            // DB postgresSQL
            POSTGRES_HOST: string
            POSTGRES_PORT: string
            POSTGRES_USER: string
            POSTGRES_PASS: string
            POSTGRES_DB: string
            // for docker start pgvector
            POSTGRES_DATA_PATH: string

            // cache redis
            REDIS_PORT: number
            REDIS_HOST: string
            REDIS_PASS: string
            REDIS_DB: number

            // WeChat API
            WX_APP_ID: string
            WX_APP_SECRET: string

            // minio
            MINIO_ACCESS_KEY: string
            MINIO_SECRET_KEY: string
            MINIO_END_POINT: string
            MINIO_PORT: string
            MINIO_BUCKET: string
            // for docker start minio
            MINIO_DATA_PATH: string
            MINIO_ROOT_USER: string
            MINIO_ROOT_PASS: string

            // gee test
            GEE_TEST_ID: string
            GEE_TEST_KEY: string

            ALI_KEY_ID: string
            ALI_KEY_SECRET: string
            ALI_SMS_TEMPLATE: string
            ALI_SMS_SIGN: string
        }
    }
}

// for env file
export {}
