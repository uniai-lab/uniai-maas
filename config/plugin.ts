/** @format */

import { EggPlugin } from 'egg'

const plugin: EggPlugin = {
    tegg: {
        enable: true,
        package: '@eggjs/tegg-plugin'
    },
    teggConfig: {
        enable: true,
        package: '@eggjs/tegg-config'
    },
    teggController: {
        enable: true,
        package: '@eggjs/tegg-controller-plugin'
    },
    teggSchedule: {
        enable: true,
        package: '@eggjs/tegg-schedule-plugin'
    },
    eventbusModule: {
        enable: true,
        package: '@eggjs/tegg-eventbus-plugin'
    },
    aopModule: {
        enable: true,
        package: '@eggjs/tegg-aop-plugin'
    },
    tracer: {
        enable: true,
        package: 'egg-tracer'
    },
    sequelize: {
        enable: true,
        package: '@openai-link/egg-sequelize-ts'
    },
    nunjucks: {
        enable: true,
        package: 'egg-view-nunjucks'
    },
    cors: {
        enable: true,
        package: 'egg-cors'
    }
    /*
    websocket: {
        enable: true,
        package: 'egg-websocket-plugin'
    }
    */
}

export default plugin
