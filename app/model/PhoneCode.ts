/** @format */

import { IndexesOptions } from 'sequelize'
import { AutoIncrement, Column, DataType, PrimaryKey, Table, Model, AllowNull, Default } from 'sequelize-typescript'

const indexes: IndexesOptions[] = [{ fields: ['phone'] }]

@Table({ indexes })
export class PhoneCode extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Column(DataType.STRING)
    phone: string

    @AllowNull(false)
    @Column(DataType.STRING)
    code: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    expire: number

    @Column(DataType.JSON)
    data: string | null

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    count: number

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect: boolean
}

export default () => PhoneCode
