/** @format */

import 'dotenv/config'
import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg'

const {
    DB_DIALECT,
    POSTGRES_DB,
    POSTGRES_HOST,
    POSTGRES_PASS,
    POSTGRES_PORT,
    POSTGRES_USER,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASS,
    REDIS_DB,
    MINIO_ACCESS_KEY,
    MINIO_END_POINT,
    MINIO_PORT,
    MINIO_SECRET_KEY
} = process.env

const ALLOW_ORIGIN = '*'
const ALLOW_METHOD = ['GET', 'POST']
const FILE_SIZE = '20mb'
const WHITELIST = [
    // office
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.wps',
    '.et',
    '.csv',
    '.odt',
    '.odp',
    '.ods',
    // images
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    // pure text
    '.json',
    '.md',
    '.txt'
]

export default (appInfo: EggAppInfo) => {
    // override config from framework / plugin
    const config: PowerPartial<EggAppConfig> = {}

    config.keys = appInfo.name + '_1678588387515_4297'

    config.security = {
        csrf: {
            enable: false
        }
    }

    config.cors = {
        origin: ALLOW_ORIGIN,
        allowMethods: ALLOW_METHOD
    }

    config.multipart = {
        mode: 'file',
        fileSize: FILE_SIZE,
        whitelist: WHITELIST
    }

    config.static = {
        prefix: '/public',
        dir: ['app/public/']
    }

    config.sequelize = {
        dialect: DB_DIALECT,
        host: POSTGRES_HOST,
        password: POSTGRES_PASS,
        port: parseInt(POSTGRES_PORT),
        username: POSTGRES_USER,
        database: POSTGRES_DB
    }

    config.redis = {
        client: {
            port: REDIS_PORT,
            host: REDIS_HOST,
            password: REDIS_PASS,
            db: REDIS_DB
        }
    }

    config.view = {
        mapping: {
            '.html': 'nunjucks'
        }
    }

    config.minio = {
        client: {
            endPoint: MINIO_END_POINT,
            port: parseInt(MINIO_PORT),
            useSSL: false,
            accessKey: MINIO_ACCESS_KEY,
            secretKey: MINIO_SECRET_KEY
        }
    }

    // first end user transaction, then response, finally log
    config.middleware = ['notFound', 'errorHandler']

    config.i18n = { defaultLocale: 'zh-CN' }

    // the return config will combines to EggAppConfig
    return config
}
