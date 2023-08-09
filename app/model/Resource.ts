/** @format */

import {
    Table,
    Column,
    AutoIncrement,
    PrimaryKey,
    Model,
    DataType,
    HasMany,
    ForeignKey,
    BelongsTo,
    AllowNull,
    Default
} from 'sequelize-typescript'
import { Dialog } from './Dialog'
import { Page } from './Page'
import { ResourceType } from './ResourceType'
import { Chat } from './Chat'
const { GLM_EMBED_DIM, OPENAI_EMBED_DIM } = process.env

@Table({ modelName: 'resource' })
export class Resource extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @ForeignKey(() => ResourceType)
    @Column(DataType.INTEGER)
    typeId!: number

    @AllowNull(false)
    @Column(DataType.INTEGER)
    page!: number

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

    static async similarFindAll(vector: number[], limit: number, distance?: number): Promise<Resource[]> {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding <=> '${JSON.stringify(vector)}' ASC`),
            where: distance ? db?.literal(`embedding <=> '${JSON.stringify(vector)}' < ${distance}`) : undefined,
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

    static async similarFindAll2(vector: number[], limit: number, distance?: number): Promise<Resource[]> {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding2 <=> '${JSON.stringify(vector)}' ASC`),
            where: distance ? db?.literal(`embedding2 <=> '${JSON.stringify(vector)}' < ${distance}`) : undefined,
            limit
        })
    }

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    promptTokens: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    totalTokens: number

    @AllowNull(false)
    @Column(DataType.STRING)
    fileName!: string

    @AllowNull(false)
    @Column(DataType.INTEGER)
    fileSize!: number

    @AllowNull(false)
    @Column(DataType.STRING)
    filePath!: string

    @AllowNull(false)
    @Column(DataType.INTEGER)
    userId!: number

    @Default(false)
    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    isDel!: boolean

    @Default(true)
    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    isEffect!: boolean

    @BelongsTo(() => ResourceType)
    type: ResourceType

    @HasMany(() => Page)
    pages: Page[]

    @HasMany(() => Dialog)
    dialogs: Dialog[]

    @HasMany(() => Chat)
    chats: Chat[]
}

export default () => Resource
