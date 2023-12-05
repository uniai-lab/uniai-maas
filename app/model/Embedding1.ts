/** @format */

import { WhereOptions } from 'sequelize'
import {
    Table,
    Column,
    AutoIncrement,
    PrimaryKey,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    AllowNull,
    Default
} from 'sequelize-typescript'
import { Resource } from './Resource'
const OPENAI_EMBED_DIM = 1536

@Table({ modelName: 'openai_embedding' })
export class Embedding1 extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    page: number

    @AllowNull(false)
    @ForeignKey(() => Resource)
    @Column(DataType.INTEGER)
    resourceId: number

    @AllowNull(false)
    @Column({
        type: `VECTOR(${OPENAI_EMBED_DIM})`,
        get() {
            const raw: string = this.getDataValue('embedding')
            return raw ? JSON.parse(raw) : null
        },
        set(v: number[] | null) {
            const embedding = v ? JSON.stringify(v) : null
            this.setDataValue('embedding', embedding)
        }
    })
    embedding: number[]

    static async similarFindAll(vector: number[], limit?: number, where?: WhereOptions) {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding <=> '${JSON.stringify(vector)}' ASC`),
            where,
            limit
        })
    }

    @AllowNull(false)
    @Default('')
    @Column(DataType.TEXT)
    content: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    tokens: number

    @BelongsTo(() => Resource)
    resource: Resource
}

export default () => Embedding1
