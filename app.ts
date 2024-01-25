/** @format */
// Run as app starts

import { Application } from 'egg'
import config from '@data/config'
import resourceType from '@data/resourceType'
import promptType from '@data/promptType'
import userResourceTab from '@data/userResourceTab'
import { User } from '@model/User'
import { UserCache } from '@interface/Cache'
import $ from '@util/util'

export default (app: Application) => {
    app.ready(async () => {
        // 只在单进程模式下执行数据库结构的修改
        if (app.config.env === 'local') {
            // update database (structure), initial data
            console.log('================SYNC DATA STRUCTURE==================')
            await app.model.query('CREATE EXTENSION if not exists vector')
            await app.model.sync({ force: false, alter: true })

            // add initial data
            console.log('====================SYNC DATA========================')
            await app.model.Config.bulkCreate(config, { updateOnDuplicate: ['value', 'description'] })
            await app.model.ResourceType.bulkCreate(resourceType, { updateOnDuplicate: ['name', 'description'] })
            await app.model.PromptType.bulkCreate(promptType, { updateOnDuplicate: ['name', 'description'] })
            await app.model.UserResourceTab.bulkCreate(userResourceTab, {
                updateOnDuplicate: ['name', 'desc', 'pid']
            })

            // update redis cache, set config
            console.log('================SYNC REDIS CACHE=====================')
            const configs = await app.model.Config.findAll({ attributes: ['key', 'value'] })
            for (const item of configs) await app.redis.set(item.key, item.value)
        }

        // add hook, update redis
        app.model.User.addHook('afterSave', async (user: User) => {
            const key = `user_${user.id}`
            const value = $.json<UserCache>(await app.redis.get(key))

            const cache: UserCache = {
                ...value,
                ...user.dataValues,
                tokenTime: user.tokenTime?.getTime() || value?.tokenTime,
                freeChanceUpdateAt: user.freeChanceUpdateAt?.getTime() || value?.freeChanceUpdateAt
            }

            await app.redis.set(key, JSON.stringify(cache))
        })
    })
}
