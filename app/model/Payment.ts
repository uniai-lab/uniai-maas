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
    Default
} from 'sequelize-typescript'
import { User } from './User'

@Table({ modelName: 'payment' })
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
    @Default('')
    @Column(DataType.STRING)
    platform: string

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    type: string

    @AllowNull(false)
    @Default(0.0)
    @Column(DataType.DECIMAL(10, 2))
    amount: number

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    currency: string

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    transactionId: string

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    status: string

    @Column(DataType.JSON)
    detail: object | null

    @Column(DataType.TEXT)
    description: string | null

    @BelongsTo(() => User)
    user: User
}

export default () => Payment
