/** @format
 * Init and query database through sequelize
 */

import * as dotenv from 'dotenv'
dotenv.config()
import * as fs from 'fs'
import { Sequelize } from 'sequelize-typescript'
import { program } from 'commander'

// tables
import { Resource } from '../app/model/Resource'
import { Page } from '../app/model/Page'
import { User } from '../app/model/User'
import { PhoneCode } from '../app/model/PhoneCode'
import { Config } from '../app/model/Config'
import { ResourceType } from '../app/model/ResourceType'
import { Chat } from '../app/model/Chat'
import { OpenAILog } from '../app/model/OpenAILog'
import { Dialog } from '../app/model/Dialog'
import { UserChance } from '../app/model/UserChance'
import { Prompt } from '../app/model/Prompt'
import { SensitiveWord } from '../app/model/SensitiveWord'

// initial data source
import openai from '../app/util/openai'
import configs from './defaults/config'
import resourceTypes from './defaults/resourceType'
import prompts from './defaults/prompt'

const db = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT as string),
    username: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    models: [
        Resource,
        Page,
        User,
        PhoneCode,
        Config,
        ResourceType,
        Chat,
        OpenAILog,
        Dialog,
        UserChance,
        Prompt,
        SensitiveWord
    ],
    define: {
        underscored: true // 转换所有驼峰命名的字段为下划线
    }
})

async function connect(): Promise<void> {
    await db.authenticate()
    await db.close()
}

async function init(force: boolean): Promise<void> {
    await db.query('CREATE EXTENSION if not exists vector')
    await db.sync({ force, alter: true })
    // auto init config and resource type
    if (force) {
        await config()
        await resourceType()
    }
    await db.close()
}

async function drop(table?: string): Promise<void> {
    await db.authenticate()
    if (table) await db.models[table].drop()
    else await db.drop()
    await db.close()
}

async function count(table: string): Promise<void> {
    await db.authenticate()
    const res = await db.models[table].count()
    console.log(res)
    await db.close()
}

async function query(table: string, id: number): Promise<void> {
    await db.authenticate()
    const res = await db.models[table].findByPk(id)
    console.log(res && res.dataValues)
    await db.close()
}
// init config table
async function config(): Promise<void> {
    await db.models['config'].bulkCreate(configs, {
        updateOnDuplicate: ['value', 'description', 'is_json']
    })
}
// init resource type table
async function resourceType(): Promise<void> {
    await db.models['resource_type'].bulkCreate(resourceTypes, {
        updateOnDuplicate: ['description']
    })
}
// init prompt table
async function prompt(): Promise<void> {
    await db.authenticate()
    for (const item of prompts) {
        const res = await openai.embedding([item.content])
        item.embedding = res.data[0].embedding
    }
    await db.models['prompt'].bulkCreate(prompts as any[])
    await db.close()
}
//generate sensitive words dict
async function sensitive() {
    const type = {
        porn: 1,
        politics: 2,
        violence: 3,
        website: 4,
        advertisement: 5
    }
    const data: any[] = []
    for (const index in type) {
        const arr = fs
            .readFileSync(`${__dirname}/sensitive-words/${index}.txt`, 'utf-8')
            .split('\n')
            .filter(v => v.length > 0)
        for (const item of [...new Set(arr)])
            data.push({
                content: item,
                type: type[index]
            })
    }
    await db.models['sensitive_word'].bulkCreate(data, {
        updateOnDuplicate: ['content']
    })
    await db.close()
}

program.name('OpenAI App Sequelize CLI').description('CLI to operate database ORM').version('0.1.0')
program.command('connect').description('Connect to database by sequelize ORM').action(connect)
program
    .command('init')
    .description('init tables')
    .option('--force', 'force to init table (clear)')
    .action(options => init(options.force ? true : false))

program.command('drop').argument('[table]', 'table name').description('drop tables in the ORM database').action(drop)
program.command('count').argument('<table>', 'table name').description('count rows in table').action(count)
program
    .command('query')
    .argument('<table>', 'table name')
    .argument('<id>', 'primary key')
    .description('query data from table')
    .action(query)
program.command('prompt').description('add to prompts template table').action(prompt)
program.command('sensitive').description('add to sensitive words to table').action(sensitive)
program.command('config').description('init config table').action(config)
program.command('resource-type').description('init resource type table').action(resourceType)
program.parse()
