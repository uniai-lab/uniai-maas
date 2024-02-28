/** @format */

import {
    Table,
    Column,
    AutoIncrement,
    PrimaryKey,
    Model,
    DataType,
    ForeignKey,
    HasMany,
    BelongsTo,
    AllowNull,
    Default,
    HasOne
} from 'sequelize-typescript'
import { Chat } from './Chat'
import { Resource } from './Resource'
import { User } from './User'
import { IndexesOptions } from 'sequelize'

const indexes: IndexesOptions[] = [
    { fields: ['user_id', 'resource_id'] },
    { fields: ['is_effect'] },
    { fields: ['is_del'] }
]

@Table({ indexes })
export class Dialog extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @ForeignKey(() => User)
    @Column(DataType.INTEGER)
    userId: number

    @ForeignKey(() => Resource)
    @Column(DataType.INTEGER)
    resourceId: number | null

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    title: string

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect: boolean

    @HasMany(() => Chat)
    chats: Chat[]

    @BelongsTo(() => User)
    user: User

    @BelongsTo(() => Resource)
    resource: Resource | null
}

export default () => Dialog
