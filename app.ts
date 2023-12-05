/** @format */
// Run as app starts

import config from '@data/config'
import resourceType from '@data/resourceType'
import userResourceTab from '@data/userResourceTab'
import { Application } from 'egg'

export default (app: Application) => {
    app.beforeStart(async () => {
        app.beforeStart(async () => {
            // 只在单进程模式下执行数据库结构的修改
            if (app.config.env === 'local') {
                // update database (structure), initial data
                console.log('================SYNC DATA STRUCTURE==================')
                await app.model.query('CREATE EXTENSION if not exists vector')
                await app.model.sync({ force: false, alter: true })

                console.log('====================SYNC DATA========================')
                await app.model.Config.bulkCreate(config, { updateOnDuplicate: ['value', 'description'] })
                await app.model.ResourceType.bulkCreate(resourceType, { updateOnDuplicate: ['type', 'description'] })
                await app.model.UserResourceTab.bulkCreate(userResourceTab, {
                    updateOnDuplicate: ['name', 'desc', 'pid']
                })

                console.log('================SYNC REDIS CACHE=====================')
                // update redis cache, set config
                const configs = await app.model.Config.findAll({ attributes: ['key', 'value'] })
                for (const item of configs) await app.redis.set(item.key, item.value)
            }
        })
    })
}
