/** @format */

import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    PrimaryKey,
    AutoIncrement,
    Default,
    AllowNull
} from 'sequelize-typescript'
import { NOW } from 'sequelize'
import { User } from './User'

@Table({ modelName: 'user_chance' })
export class UserChance extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @ForeignKey(() => User)
    @Column(DataType.INTEGER)
    userId!: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    level: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    uploadSize: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    chatChance: number

    @AllowNull(false)
    @Default(NOW)
    @Column(DataType.DATE)
    chatChanceUpdateAt: Date

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    chatChanceFree: number

    @AllowNull(false)
    @Default(NOW)
    @Column(DataType.DATE)
    chatChanceFreeUpdateAt: Date

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    uploadChance: number

    @AllowNull(false)
    @Default(NOW)
    @Column(DataType.DATE)
    uploadChanceUpdateAt: Date

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    uploadChanceFree: number

    @AllowNull(false)
    @Default(NOW)
    @Column(DataType.DATE)
    uploadChanceFreeUpdateAt: Date

    @BelongsTo(() => User)
    user: User
}

export default () => UserChance
