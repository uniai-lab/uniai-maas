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
import { UserResourceTab } from './UserResourceTab'

const EMBED_DIM = 1024

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
    @ForeignKey(() => UserResourceTab)
    @Column(DataType.INTEGER)
    tabId: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    page: number

    /** Array containing the embedding data. */
    @Column({
        type: `VECTOR(${EMBED_DIM})`,
        get() {
            const raw: string | null = this.getDataValue('embedding')
            return raw ? (JSON.parse(raw) as number[]) : null
        },
        set(v: number[]) {
            if (Array.isArray(v) && v.every(e => typeof e === 'number') && v.length === EMBED_DIM)
                this.setDataValue('embedding', JSON.stringify(v))
            else this.setDataValue('embedding', null)
        }
    })
    embedding: number[] | null

    static async similarFindAll(vector: number[], distance?: number, limit: number = 1) {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding <=> '${JSON.stringify(vector)}' ASC`),
            where: distance ? db?.literal(`embedding <=> '${JSON.stringify(vector)}' < ${distance}`) : undefined,
            limit
        })
    }
    static async similarCount(vector: number[], distance: number) {
        return await this.count({
            where: this.sequelize?.literal(`embedding <=> '${JSON.stringify(vector)}' < ${distance}`)
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

    @BelongsTo(() => UserResourceTab)
    tab: UserResourceTab

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
