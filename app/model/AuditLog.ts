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
    @Default('')
    @Column(DataType.STRING)
    source: 'chat' | 'resource' | 'user' | ''

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    sourceId: number

    @AllowNull(false)
    @Column(DataType.TEXT)
    content: string

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    flag: boolean

    @Column(DataType.JSON)
    data: string | null

    @AllowNull(false)
    @Column(DataType.STRING)
    provider: ContentAuditEnum
}

export default () => AuditLog
