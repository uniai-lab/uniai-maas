/** @format */
// Models for milvus

export interface Resource {
    id?: number
    page: number
    embedding: Array<number>
    filepath: string
}

export interface Page {
    id?: number
    page: number
    resource_id: number
    embedding: Array<number>
    content: string
}
