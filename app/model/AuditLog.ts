/** @format */

import { Table, Column, AutoIncrement, PrimaryKey, Model, DataType, AllowNull, Default } from 'sequelize-typescript'
import { ContentAuditEnum } from '@interface/Enum'

@Table({ modelName: 'audit_log' })
export class AuditLog extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    userId: number

    @AllowNull(false)
    @Column(DataType.TEXT)
    content: string

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    flag: boolean

    @Column(DataType.JSON)
    data: object | null

    @AllowNull(false)
    @Column(DataType.STRING)
    provider: ContentAuditEnum
}

export default () => AuditLog
