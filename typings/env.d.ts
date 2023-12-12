/** @format */

import { ChatModelEnum, GLMSubModel, GPTSubModel, OSSEnum, SPKSubModel } from '@interface/Enum'

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // initial admin token
            ADMIN_TOKEN: string

            // OpenAI GPT
            OPENAI_API: string
            OPENAI_API_VERSION: string
            OPENAI_API_KEY: string

            // GLM
            GLM_API: string
            GLM_API_REMOTE: string
            GLM_API_KEY: string

            // Spark
            SPARK_API: string
            SPARK_API_KEY: string
            SPARK_API_SECRET: string
            SPARK_APP_ID: string

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
            WX_APP_AUTH_URL: string
            WX_APP_ACCESS_TOKEN_URL: string
            WX_APP_PHONE_URL: string
            WX_APP_MSG_CHECK: string

            OSS_TYPE: OSSEnum
            // tencent oss
            // COS_SECRET_ID: string
            // COS_SECRET_KEY: string
            // COS_BUCKET: string
            // COS_REGION: string

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

            // stable diffusion
            STABLE_DIFFUSION_API: string

            // mid journey
            MID_JOURNEY_API: string
            MID_JOURNEY_TOKEN: string

            // google search
            GOOGLE_SEARCH_API_TOKEN: string
            GOOGLE_SEARCH_ENGINE_ID: string
        }
    }
}

// for env file
export {}
