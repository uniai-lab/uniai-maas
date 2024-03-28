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
import { ChatRoleEnum, ChatModelProvider, ImagineModelProvider, ChatModel, ImagineModel } from 'uniai'
import { IndexesOptions } from 'sequelize'

const indexes: IndexesOptions[] = [
    { fields: ['role'] },
    { fields: ['model'] },
    { fields: ['sub_model'] },
    { fields: ['dialog_id'] },
    { fields: ['resource_id'] },
    { fields: ['is_effect'] },
    { fields: ['is_del'] }
]
@Table({ indexes })
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
    @Default('')
    @Column(DataType.TEXT)
    content: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    token: number

    @ForeignKey(() => Resource)
    @Column(DataType.INTEGER)
    resourceId: number | null

    @Column(DataType.STRING)
    resourceName: string | null

    @Column(DataType.STRING)
    model: ChatModelProvider | ImagineModelProvider | string | null

    @Column(DataType.STRING)
    subModel: ChatModel | ImagineModel | string | null

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
    resource: Resource | null
}

export default () => Chat
