/** @format */

import { DataType } from '@zilliz/milvus2-sdk-node/dist/milvus/const/Milvus'
import { CreateCollectionReq } from '@zilliz/milvus2-sdk-node/dist/milvus/types'
// Milvus数据库里的collections，相当于表
export const resource: CreateCollectionReq = {
    collection_name: 'Resource',
    description: 'Resource collection store files content and embeddings',
    fields: [
        {
            name: 'id',
            data_type: DataType.Int64,
            is_primary_key: true,
            autoID: true,
            description: ''
        },
        {
            name: 'page',
            data_type: DataType.Int16,
            description: 'Total page numbers'
        },
        {
            name: 'embedding',
            data_type: DataType.FloatVector,
            type_params: {
                dim: process.env.OPENAI_EMBED_DIM
            },
            description: 'Embedding of each resource'
        },
        {
            name: 'filepath',
            data_type: DataType.VarChar,
            type_params: {
                max_length: '255'
            },
            description: 'Resource saving path'
        }
    ]
}

export const page: CreateCollectionReq = {
    collection_name: 'Page',
    description: 'One resource to many pages',
    fields: [
        {
            name: 'id',
            data_type: DataType.Int64,
            is_primary_key: true,
            autoID: true,
            description: ''
        },
        {
            name: 'page',
            data_type: DataType.Int16,
            description: 'page number'
        },
        {
            name: 'resource_id',
            data_type: DataType.Int64,
            description: 'Link to resource collection, the resource id'
        },
        {
            name: 'embedding',
            data_type: DataType.FloatVector,
            type_params: {
                dim: process.env.OPENAI_EMBED_DIM
            },
            description: 'Embedding of one page'
        },
        {
            name: 'content',
            data_type: DataType.VarChar,
            type_params: {
                max_length: '1024'
            },
            description: 'Original content of each page'
        }
    ]
}
