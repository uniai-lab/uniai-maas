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
import { IndexesOptions } from 'sequelize'
import { PromptType } from './PromptType'
import { ChatRoleEnum } from '@interface/Enum'

const indexes: IndexesOptions[] = [{ fields: ['type_id'] }]

@Table({ indexes })
export class Prompt extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @ForeignKey(() => PromptType)
    @Column(DataType.INTEGER)
    typeId: number

    @AllowNull(false)
    @Default(ChatRoleEnum.SYSTEM)
    @Column(DataType.STRING)
    role: ChatRoleEnum

    @AllowNull(false)
    @Default('')
    @Column(DataType.TEXT)
    content: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    tokens: number

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

    @BelongsTo(() => PromptType)
    type: PromptType
}

export default () => Prompt
