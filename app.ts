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
    app.beforeStart(async () => {
        // 只在单进程模式下执行数据库结构的修改
        if (app.config.env === 'local') {
            await syncData(app)
            // clean redis
            await app.redis.flushdb()
            await syncConfigCache(app)
            // await updateNewRows(app)
        }

        await hookUserSave(app)
    })
}
async function syncData(app: Application) {
    // sync database table structure
    console.log('================SYNC DATA STRUCTURE==================')
    await app.model.query('CREATE EXTENSION if not exists vector')
    await app.model.sync({ force: false, alter: true })

    // add initial table data
    console.log('==================SYNC INIT DATA=====================')
    await app.model.Config.bulkCreate(config, { updateOnDuplicate: ['value', 'description'] })
    await app.model.ResourceType.bulkCreate(resourceType, { updateOnDuplicate: ['name', 'description'] })
    await app.model.PromptType.bulkCreate(promptType, { updateOnDuplicate: ['name', 'description'] })
    await app.model.UserResourceTab.bulkCreate(userResourceTab, {
        updateOnDuplicate: ['name', 'desc', 'pid']
    })
}
// set config to redis cache
async function syncConfigCache(app: Application) {
    console.log('================SYNC CONFIG CACHE====================')
    const configs = await app.model.Config.findAll({ attributes: ['key', 'value'] })
    for (const item of configs) await app.redis.set(item.key, item.value)
}

// update new rows
async function updateNewRows(app: Application) {
    console.log('================UPDATE LARGE ROWs=====================')
    const max: number = await app.model.User.max('id')
    for (let i = 1; i <= max; i++) {
        const res = await app.model.User.update({ freeChanceUpdateAt: new Date(0) }, { where: { id: i } })
        console.log(i, res)
    }
}

// hook user model save
async function hookUserSave(app: Application) {
    console.log('===============HOOK USER CACHE SYNC==================')
    app.model.User.addHook('afterSave', async (user: User) => {
        if (!user.id) return

        const value = $.json<UserCache>(await app.redis.get(`user_${user.id}`))

        const cache: UserCache = {
            ...value,
            ...user.dataValues,
            tokenTime: user.tokenTime?.getTime() || value?.tokenTime || 0,
            freeChanceUpdateAt: user.freeChanceUpdateAt?.getTime() || value?.freeChanceUpdateAt || 0
        }

        await app.redis.set(`user_${user.id}`, JSON.stringify(cache))
    })
}
