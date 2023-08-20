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
import { Dialog } from './Dialog'
import { Resource } from './Resource'

@Table({ modelName: 'chat' })
export class Chat extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @ForeignKey(() => Dialog)
    @Column(DataType.INTEGER)
    dialogId: number

    @AllowNull(false)
    @Column(DataType.STRING)
    role: string

    @AllowNull(false)
    @Column(DataType.TEXT)
    content: string

    @ForeignKey(() => Resource)
    @Column(DataType.INTEGER)
    resourceId: number

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect: boolean

    @BelongsTo(() => Dialog)
    dialog: Dialog

    @BelongsTo(() => Resource)
    resource: Resource
}

export default () => Chat
