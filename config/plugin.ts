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
        enable: false,
        package: '@eggjs/tegg-schedule-plugin'
    },
    eventbusModule: {
        enable: false,
        package: '@eggjs/tegg-eventbus-plugin'
    },
    aopModule: {
        enable: false,
        package: '@eggjs/tegg-aop-plugin'
    },
    tracer: {
        enable: false,
        package: 'egg-tracer'
    },
    sequelize: {
        enable: true,
        package: 'egg-sequelize-typescript'
    },
    nunjucks: {
        enable: true,
        package: 'egg-view-nunjucks'
    },
    cors: {
        enable: true,
        package: 'egg-cors'
    },
    redis: {
        enable: true,
        package: 'egg-redis'
    },
    minio: {
        enable: true,
        package: 'egg-minio-typescript'
    }
}

export default plugin
