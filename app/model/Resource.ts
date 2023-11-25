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
import { Embedding1 } from './Embedding1'
import { Embedding2 } from './Embedding2'
import { Includeable } from 'sequelize'

@Table({ modelName: 'resource' })
export class Resource extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @ForeignKey(() => ResourceType)
    @Column(DataType.INTEGER)
    typeId: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    page: number

    @Column({
        type: `VECTOR(${process.env.OPENAI_EMBED_DIM})`,
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

    static async similarFindAll(
        vector: number[],
        limit: number = 1,
        distance?: number,
        include?: Includeable | Includeable[]
    ) {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding <=> '${JSON.stringify(vector)}' ASC`),
            where: distance ? db?.literal(`embedding <=> '${JSON.stringify(vector)}' < ${distance}`) : undefined,
            limit,
            include
        })
    }

    @Column({
        type: `VECTOR(${process.env.TEXT2VEC_EMBED_DIM})`,
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

    static async similarFindAll2(
        vector: number[],
        limit: number = 1,
        distance?: number,
        include?: Includeable | Includeable[]
    ) {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding2 <=> '${JSON.stringify(vector)}' ASC`),
            where: distance ? db?.literal(`embedding2 <=> '${JSON.stringify(vector)}' < ${distance}`) : undefined,
            limit,
            include
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
    @Default('')
    @Column(DataType.STRING)
    fileName: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    fileSize: number

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    filePath: string

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    fileExt: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    userId: number

    @Default(false)
    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @Default(true)
    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    isEffect: boolean

    @BelongsTo(() => ResourceType)
    type: ResourceType

    @HasMany(() => Page)
    pages: Page[]

    @HasMany(() => Dialog)
    dialogs: Dialog[]

    @HasMany(() => Chat)
    chats: Chat[]

    @HasMany(() => Embedding1)
    embeddings1: Embedding1[]

    @HasMany(() => Embedding2)
    embeddings2: Embedding2[]
}

export default () => Resource
