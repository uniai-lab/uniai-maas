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
import { ChatModelEnum, ChatRoleEnum } from '../interface/Enum'

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
    role: ChatRoleEnum

    @AllowNull(false)
    @Column(DataType.TEXT)
    content: string

    @ForeignKey(() => Resource)
    @Column(DataType.INTEGER)
    resourceId: number | null

    @Column(DataType.STRING)
    model: ChatModelEnum | null

    @Column(DataType.STRING)
    subModel: string | null

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
