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

@Table({ modelName: 'page' })
export class Page extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Column(DataType.INTEGER)
    page!: number

    @AllowNull(false)
    @ForeignKey(() => Resource)
    @Column(DataType.INTEGER)
    resourceId!: number

    @Column({
        type: `VECTOR(${process.env.OPENAI_EMBED_DIM})`,
        get(): number[] {
            return JSON.parse(this.getDataValue('embedding'))
        },
        set(value: number[]) {
            this.setDataValue('embedding', JSON.stringify(value))
        }
    })
    embedding!: number[]

    static async similarFindAll(vector: number[], limit?: number, where?: WhereOptions) {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding <=> '${JSON.stringify(vector)}' ASC`),
            where: where,
            limit
        })
    }

    @Column({
        type: `VECTOR(${process.env.TEXT2VEC_EMBED_DIM})`,
        get(): number[] {
            return JSON.parse(this.getDataValue('embedding2'))
        },
        set(value: number[]) {
            this.setDataValue('embedding2', JSON.stringify(value))
        }
    })
    embedding2!: number[]

    static async similarFindAll2(vector: number[], limit?: number, where?: WhereOptions) {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding2 <=> '${JSON.stringify(vector)}' ASC`),
            where: where,
            limit
        })
    }

    @AllowNull(false)
    @Column(DataType.TEXT)
    content!: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    length: number

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel!: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect!: boolean

    @BelongsTo(() => Resource)
    resource: Resource
}

export default () => Page
