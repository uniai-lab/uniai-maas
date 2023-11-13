/** @format */

import 'dotenv/config'
import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg'
const { POSTGRES_DB, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER } = process.env

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
        fileSize: '5mb',
        whitelist: ['.txt', '.pdf', '.doc', '.docx', '.png', '.jpg', 'jpeg', '.gif', '.xls', '.xlsx', '.ppt', '.pptx']
    }
    config.static = {
        prefix: '/public',
        dir: ['app/public/']
    }

    config.sequelize = {
        dialect: 'postgres',
        host: POSTGRES_HOST,
        password: POSTGRES_PASSWORD,
        port: POSTGRES_PORT,
        username: POSTGRES_USER,
        database: POSTGRES_DB
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
