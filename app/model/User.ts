/** @format */

import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    Unique,
    HasMany,
    AllowNull,
    Default
} from 'sequelize-typescript'
import { IndexesOptions } from 'sequelize'
import { Dialog } from './Dialog'

const indexes: IndexesOptions[] = [{ fields: ['level'] }, { fields: ['is_effect'] }, { fields: ['is_del'] }]

@Table({ indexes })
export class User extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @Unique
    @Column(DataType.STRING)
    username: string | null

    @Column(DataType.INTEGER)
    countryCode: number | null

    @Unique
    @Column(DataType.STRING)
    phone: string | null

    @Unique
    @Column(DataType.STRING)
    email: string | null

    @Column(DataType.STRING)
    password: string | null

    @Column(DataType.STRING)
    token: string | null

    @Column(DataType.STRING)
    name: string | null

    @Column(DataType.TEXT)
    avatar: string | null

    @Unique
    @Column(DataType.STRING)
    wxOpenId: string | null

    @Unique
    @Column(DataType.STRING)
    wxPublicOpenId: string | null

    @Unique
    @Column(DataType.STRING)
    wxUnionId: string | null

    @AllowNull(false)
    @Default(DataType.NOW)
    @Column(DataType.DATE)
    tokenTime: Date

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    score: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    level: number

    @AllowNull(false)
    @Default(new Date(0))
    @Column(DataType.DATE)
    levelExpiredAt: Date

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    uploadSize: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    chatChance: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    chatChanceFree: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    uploadChance: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    uploadChanceFree: number

    @AllowNull(false)
    @Default(DataType.NOW)
    @Column(DataType.DATE)
    freeChanceUpdateAt: Date

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect: boolean

    @HasMany(() => Dialog)
    dialogs: Dialog[]
}

export default () => User
