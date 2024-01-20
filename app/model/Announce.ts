/** @format */

import { Table, Column, AutoIncrement, PrimaryKey, Model, DataType, AllowNull, Default } from 'sequelize-typescript'

@Table
export class Announce extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Column(DataType.STRING)
    title: string

    @AllowNull(false)
    @Column(DataType.TEXT)
    content: string

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    open: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    closeable: boolean
}

export default () => Announce
