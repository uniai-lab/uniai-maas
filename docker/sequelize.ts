/** @format
 * Init and query database through sequelize
 * init (--force) - init the database tables and data from app/model
 * drop - drop all the data in database (danger)
 */

import 'dotenv/config'
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
import { Embedding1 } from '../app/model/Embedding1'
import { Embedding2 } from '../app/model/Embedding2'

// initial data source
import configs from './data/config'
import resourceTypes from './data/resourceType'

// select models
const models = [
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
    Embedding1,
    Embedding2
]

// define db
const db = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT as string),
    username: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    models,
    define: { underscored: true }
})

// test connection
async function connect(): Promise<void> {
    await db.authenticate()
    await db.close()
}
// init database
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
// drop table
async function drop(table?: string): Promise<void> {
    await db.authenticate()
    if (table) await db.models[table].drop()
    else await db.drop()
    await db.close()
}
// count rows
async function count(table: string): Promise<void> {
    await db.authenticate()
    const res = await db.models[table].count()
    console.log(res)
    await db.close()
}
// qurty data by id
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

program.name('UniAI Database Sequelize CLI').description('A client to operate database').version('0.2.0')
program.command('connect').description('Test connecting to database').action(connect)
program
    .command('init')
    .description('Init all the tables in database')
    .option('--force', 'Force to init table')
    .action(options => init(options.force ? true : false))

program.command('drop').argument('[table]', 'table name').description('Drop tables in database').action(drop)
program.command('count').argument('<table>', 'table name').description('Count rows in a table').action(count)
program
    .command('query')
    .argument('<table>', 'Table name')
    .argument('<id>', 'Primary key')
    .description('Query data from table by primary key id')
    .action(query)
program.command('config').description('Init table of config').action(config)
program.command('resource-type').description('Init table of resource type').action(resourceType)
program.parse()
