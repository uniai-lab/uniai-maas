/** @format */

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

    @AllowNull(false)
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

    static async similarFindAll(vector: number[], limit?: number, resourceId?: number): Promise<Page[]> {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding <=> '${JSON.stringify(vector)}' ASC`),
            where: { resourceId },
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
