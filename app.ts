/**
 * Run when the app starts.
 *
 * @format
 * @param app - The Egg.js application instance.
 */

import { Application } from 'egg'
import { Model } from 'sequelize-typescript'
import { ModelStatic, Optional } from 'sequelize'
import { User } from '@model/User'
import { UserCache } from '@interface/Cache'
import ResourceTypeData from '@data/resourceType'
import PromptTypeData from '@data/promptType'
import UserResourceTabData from '@data/userResourceTab'
import PayItemData from '@data/payItem'
import Config from '@data/config'
import $ from '@util/util'

/**
 * Initializes the application.
 * @param app - The Egg.js application instance.
 */
export default (app: Application) => {
    app.beforeStart(async () => {
        if (app.config.env === 'local') {
            // await app.redis.flushdb() // flush redis, be careful
            // await syncDataStruct(app)
            await syncDatabase(app) // init database struct and data
            await syncConfigCache(app) // sync config cache
            await syncPayItemCache(app)
        }

        await hookUserSave(app) // hook user save
    })
}

async function syncDataStruct(app: Application, force: boolean = false) {
    console.log('================SYNC DATA STRUCT=====================')
    await app.model.query('CREATE EXTENSION if not exists vector')
    await app.model.sync({ force, alter: true })
}
/**
 * Synchronizes the database structure and initial data.
 * @param app - The Egg.js application instance.
 */
async function syncDatabase(app: Application) {
    console.log('==================SYNC INIT DATA=====================')
    await app.model.Config.truncate({ force: true })
    await syncTableData(app.model.Config, Config, ['value', 'description'])
    await syncTableData(app.model.ResourceType, ResourceTypeData, ['name', 'description'])
    await syncTableData(app.model.PromptType, PromptTypeData, ['name', 'description'])
    await syncTableData(app.model.UserResourceTab, UserResourceTabData, ['name', 'desc', 'pid'])
    await syncTableData(app.model.PayItem, PayItemData, ['title', 'description', 'price', 'score', 'chance'])
}

/**
 * Synchronizes table data with the provided Sequelize model.
 * @param model - The Sequelize model to synchronize data for.
 * @param data - The data to be synchronized.
 * @param updateOnDuplicate - Fields to update in case of duplicate data.
 */
async function syncTableData(model: ModelStatic<Model>, data: Optional<any, string>[], updateOnDuplicate: string[]) {
    await model.bulkCreate(data, { updateOnDuplicate })
}

/**
 * Sets configuration data to Redis cache.
 * @param app - The Egg.js application instance.
 */
async function syncConfigCache(app: Application) {
    console.log('================SYNC CONFIG CACHE====================')
    const configs = await app.model.Config.findAll({ attributes: ['key', 'value'] })
    for (const item of configs) {
        await app.redis.set(item.key, item.value)
        console.log(item.key, item.value)
    }
}
/**
 * Sets payment items data to Redis cache.
 * @param app - The Egg.js application instance.
 */
async function syncPayItemCache(app: Application) {
    console.log('================SYNC PAY ITEM CACHE====================')
    const items = await app.model.PayItem.findAll({
        attributes: ['id', 'title', 'description', 'price', 'score', 'chance'],
        where: { isEffect: true, isDel: false }
    })
    await app.redis.set('PAY_ITEM', JSON.stringify(items))
}

/**
 * Hooks the User model to set user cache in Redis.
 * @param app - The Egg.js application instance.
 */
async function hookUserSave(app: Application) {
    console.log('===============HOOK USER CACHE SYNC==================')
    const res = app.model.User.addHook('afterSave', async (user: User) => {
        if (!user.id) return

        const value = $.json<UserCache>(await app.redis.get(`user_${user.id}`))
        const cache: UserCache = {
            ...value,
            ...user.dataValues,
            levelExpiredAt: user.levelExpiredAt?.getTime() || value?.levelExpiredAt || 0,
            tokenTime: user.tokenTime?.getTime() || value?.tokenTime || 0,
            freeChanceUpdateAt: user.freeChanceUpdateAt?.getTime() || value?.freeChanceUpdateAt || 0
        }

        await app.redis.set(`user_${user.id}`, JSON.stringify(cache))
    })
    console.log('HOOK', res)
}
