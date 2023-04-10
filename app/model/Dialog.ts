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
    Default
} from 'sequelize-typescript'
import { Chat } from './Chat'
import { Resource } from './Resource'
import { User } from './User'

@Table({ modelName: 'dialog', indexes: [{ fields: ['user_id', 'resource_id'], unique: true }] })
export class Dialog extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @ForeignKey(() => User)
    @Column(DataType.INTEGER)
    userId!: number

    @ForeignKey(() => Resource)
    @Column(DataType.INTEGER)
    resourceId: number

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel!: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect!: boolean

    @HasMany(() => Chat)
    chats: Chat[]

    @BelongsTo(() => User)
    user: User

    @BelongsTo(() => Resource)
    resource: Resource
}

export default () => Dialog
