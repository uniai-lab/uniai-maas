/** @format */

import {
    Table,
    Column,
    Model,
    DataType,
    Unique,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    Default
} from 'sequelize-typescript'

@Table({ modelName: 'config' })
export class Config extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    key!: string

    @AllowNull(false)
    @Column(DataType.TEXT)
    value!: string

    @Column(DataType.TEXT)
    description: string

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel!: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect!: boolean
}

export default () => Config
