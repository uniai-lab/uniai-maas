/** @format */

import { Table, Column, AutoIncrement, PrimaryKey, Model, DataType, AllowNull, Default } from 'sequelize-typescript'
import { AuditProvider } from '@interface/Enum'
import { IndexesOptions } from 'sequelize'

const indexes: IndexesOptions[] = [{ fields: ['user_id'] }, { fields: ['flag'] }, { fields: ['provider'] }]

@Table({ indexes })
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
    provider: AuditProvider
}

export default () => AuditLog
