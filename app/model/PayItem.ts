/** @format */

import {
    Table,
    Column,
    AutoIncrement,
    PrimaryKey,
    Model,
    DataType,
    HasMany,
    AllowNull,
    Default
} from 'sequelize-typescript'
import { Payment } from './Payment'
import Decimal from 'decimal.js'

@Table
export class PayItem extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Column(DataType.STRING)
    title: string

    @AllowNull(false)
    @Column(DataType.JSON)
    description: string[]

    @AllowNull(false)
    @Default(0.0)
    @Column({
        type: DataType.DECIMAL(10, 2),
        get() {
            return new Decimal(this.getDataValue('price'))
        },
        set(v: Decimal) {
            this.setDataValue('price', v.toString())
        }
    })
    price: Decimal

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    chance: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    score: number

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect: boolean

    @HasMany(() => Payment)
    payments: Payment[]
}

export default () => PayItem
