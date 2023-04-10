/**
 *  数据库文件
 *
 * @format
 */

import {MutationResult, QueryResults} from '@zilliz/milvus2-sdk-node/dist/milvus/types'
import {MilvusClient} from '@zilliz/milvus2-sdk-node'

const milvusClient = new MilvusClient(process.env.MILVUS_ADDR as string)

export default {
    async insert(collection: string, data: Array<any>): Promise<MutationResult> {
        return await milvusClient.dataManager.insert({
            collection_name: collection,
            fields_data: data,
        })
    },

    async query(collection: string, expr: string, output?: string[]): Promise<QueryResults> {
        const results = await milvusClient.dataManager.query({
            collection_name: collection,
            expr,
            output_fields: output,
        })
        return results
    },
}
