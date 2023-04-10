/** @format */

import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg'
import * as dotenv from 'dotenv'
dotenv.config()

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
        origin: '*',
        allowMethods: 'GET,POST'
    }
    config.multipart = {
        mode: 'file',
        fileSize: '10mb',
        whitelist: ['.txt', '.pdf', '.doc', '.docx', '.png', '.jpg', '.gif']
    }
    config.static = {
        prefix: '/public',
        dir: ['app/public/']
    }

    config.sequelize = {
        dialect: 'postgres',
        host: process.env.POSTGRES_HOST,
        password: process.env.POSTGRES_PASSWORD,
        port: parseInt(process.env.POSTGRES_PORT as string),
        username: process.env.POSTGRES_USER,
        database: process.env.POSTGRES_DB
    }

    config.view = {
        mapping: {
            '.html': 'nunjucks'
        }
    }

    config.middleware = ['notFound']

    config.i18n = { defaultLocale: 'zh-CN' }

    // use for cookie sign key, should change to your own and keep security
    const bizConfig = {
        sourceUrl: `https://github.com/eggjs/examples/tree/master/${appInfo.name}`
    }

    // the return config will combines to EggAppConfig
    return {
        ...config,
        ...bizConfig
    }
}
