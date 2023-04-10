/** @format */

import * as dotenv from 'dotenv'
dotenv.config()
import { MilvusClient } from '@zilliz/milvus2-sdk-node'
import { ResStatus } from '@zilliz/milvus2-sdk-node/dist/milvus/types'
import { program } from 'commander'
import { resource, page } from './collections'
const milvusClient = new MilvusClient(process.env.MILVUS_ADDR as string)

async function init(): Promise<void> {
    const extra_params = {
        index_type: 'IVF_FLAT',
        metric_type: 'L2',
        params: JSON.stringify({ nlist: 10 })
    }
    const res: Array<ResStatus> = []
    res.push(await milvusClient.collectionManager.createCollection(resource))
    res.push(await milvusClient.collectionManager.createCollection(page))
    await release('Resource')
    await release('Page')
    res.push(
        await milvusClient.indexManager.createIndex({
            collection_name: 'Resource',
            field_name: 'embedding',
            extra_params
        })
    )
    res.push(
        await milvusClient.indexManager.createIndex({
            collection_name: 'Page',
            field_name: 'embedding',
            extra_params
        })
    )
    console.log('init', res)
}
async function release(collection: string): Promise<void> {
    const res = await milvusClient.collectionManager.releaseCollection({
        collection_name: collection
    })
    console.log(`release ${collection}`, res)
}
async function load(collection: string): Promise<void> {
    console.log(collection)
    const res = await milvusClient.collectionManager.loadCollection({
        collection_name: collection
    })
    console.log(`load ${collection}`, res)
}
async function collections(): Promise<void> {
    const res = await milvusClient.collectionManager.showCollections()
    console.log('collections', res)
}
async function query(collection: string, id: number): Promise<void> {
    console.log(collection)
    console.log(id)
    const results = await milvusClient.dataManager.query({
        collection_name: collection,
        expr: `resource_id == ${id}`,
        output_fields: ['content']
    })
    console.log(results)
}
process.argv[1].includes('milvus')

program.name('Milvus App').description('CLI to operate milvus database').version('0.1.0')
program.command('init').description('init collections in milvus database').action(init)
program
    .command('load')
    .description('load a collection')
    .argument('<collection>', 'collection name to load')
    .action(str => load(str))
program
    .command('release')
    .description('release a collection')
    .argument('<collection>', 'collection name to release')
    .action(str => release(str))
program
    .command('query')
    .description('query data from colletion')
    .argument('<collection>', 'collection name to release')
    .argument('<id>', 'primary key id')
    .action(query)
program.command('collections').description('list all collections').action(collections)
program.parse()
