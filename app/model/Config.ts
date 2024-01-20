/** @format */

import { Table, Column, Model, DataType, Unique, PrimaryKey, AutoIncrement, AllowNull } from 'sequelize-typescript'

@Table
export class Config extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    key: string

    @AllowNull(false)
    @Column(DataType.TEXT)
    value: string

    @Column(DataType.TEXT)
    description: string | null
}

export default () => Config
