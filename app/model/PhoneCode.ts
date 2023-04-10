/** @format */

import { AutoIncrement, Column, DataType, PrimaryKey, Table, Unique, Model, AllowNull } from 'sequelize-typescript'

@Table({ modelName: 'phone_code' })
export class PhoneCode extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Unique
    @Column(DataType.STRING)
    phone!: string

    @AllowNull(false)
    @Column(DataType.STRING)
    code!: string
}

export default () => PhoneCode
