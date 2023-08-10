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

const { GLM_EMBED_DIM, OPENAI_EMBED_DIM } = process.env

@Table({ modelName: 'page' })
export class Page extends Model {
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

    @Column({
        type: `VECTOR(${OPENAI_EMBED_DIM})`,
        get() {
            const raw = this.getDataValue('embedding')
            return raw ? JSON.parse(raw) : null
        },
        set(v: number[] | null) {
            if (Array.isArray(v)) this.setDataValue('embedding', JSON.stringify([...v]))
            else this.setDataValue('embedding', null)
        }
    })
    embedding: number[] | null

    static async similarFindAll(vector: number[], limit?: number, where?: WhereOptions) {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding <=> '${JSON.stringify(vector)}' ASC`),
            where: where,
            limit
        })
    }

    @Column({
        type: `VECTOR(${GLM_EMBED_DIM})`,
        get() {
            const raw = this.getDataValue('embedding2')
            return raw ? JSON.parse(raw) : null
        },
        set(v: number[] | null) {
            if (Array.isArray(v)) this.setDataValue('embedding2', JSON.stringify([...v]))
            else this.setDataValue('embedding2', null)
        }
    })
    embedding2: number[] | null

    static async similarFindAll2(vector: number[], limit?: number, where?: WhereOptions) {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding2 <=> '${JSON.stringify(vector)}' ASC`),
            where: where,
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

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect: boolean

    @BelongsTo(() => Resource)
    resource: Resource
}

export default () => Page
