/** @format */
// Run as app starts

import { Application } from 'egg'
import config from '@data/config'
import resourceType from '@data/resourceType'

export default (app: Application) => {
    app.beforeStart(async () => {
        // update database (structure), initial data
        await app.model.query('CREATE EXTENSION if not exists vector')
        await app.model.sync({ force: false, alter: true })
        await app.model.Config.bulkCreate(config, { updateOnDuplicate: ['value', 'description'] })
        await app.model.ResourceType.bulkCreate(resourceType, { updateOnDuplicate: ['description'] })

        // update redis cache, set config
        const configs = await app.model.Config.findAll({ attributes: ['key', 'value'] })
        for (const item of configs) await app.redis.set(item.key, item.value)
    })
}
