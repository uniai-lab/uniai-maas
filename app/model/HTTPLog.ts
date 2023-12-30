/** @format */

import { Table, Column, AutoIncrement, PrimaryKey, Model, DataType, AllowNull, Default } from 'sequelize-typescript'

@Table({ modelName: 'http_log' })
export class HTTPLog extends Model {
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
    ip: string

    @AllowNull(false)
    @Column(DataType.STRING)
    method: string

    @Column(DataType.JSON)
    header: object | null

    @Column(DataType.JSON)
    body: object | null

    @Column(DataType.JSON)
    query: object | null

    @Column(DataType.JSON)
    files: object | null

    @AllowNull(false)
    @Column(DataType.INTEGER)
    status: number

    @Column(DataType.JSON)
    data: object | null

    @AllowNull(false)
    @Column(DataType.STRING)
    msg: string

    @AllowNull(false)
    @Column(DataType.STRING)
    controller: string

    @AllowNull(false)
    @Column(DataType.STRING)
    action: string
}

export default () => HTTPLog
