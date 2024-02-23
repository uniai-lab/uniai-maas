/** @format */

import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    BelongsTo,
    AllowNull,
    AutoIncrement,
    Default,
    Unique
} from 'sequelize-typescript'
import { IndexesOptions } from 'sequelize'
import Decimal from 'decimal.js'
import { PayType } from '@interface/Enum'
import { User } from './User'
import { PayItem } from './PayItem'

const indexes: IndexesOptions[] = [
    { fields: ['user_id'] },
    { fields: ['item_id'] },
    { fields: ['platform'] },
    { fields: ['type'] },
    { fields: ['currency'] },
    { fields: ['status'] }
]

@Table({ indexes })
export class Payment extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @ForeignKey(() => User)
    @Column(DataType.INTEGER)
    userId: number

    @AllowNull(false)
    @ForeignKey(() => PayItem)
    @Column(DataType.INTEGER)
    itemId: number

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    platform: PayType

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    type: string

    @AllowNull(false)
    @Default(0.0)
    @Column({
        type: DataType.DECIMAL(10, 2),
        get() {
            return new Decimal(this.getDataValue('amount'))
        },
        set(v: Decimal) {
            this.setDataValue('amount', v.toString())
        }
    })
    amount: Decimal

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    currency: string

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    transactionId: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    status: number

    @Column(DataType.JSON)
    detail: object | null

    @Column(DataType.JSON)
    result: object | null

    @Column(DataType.TEXT)
    description: string | null

    @BelongsTo(() => User)
    user: User

    @BelongsTo(() => PayItem)
    item: PayItem
}

export default () => Payment
