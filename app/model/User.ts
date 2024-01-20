/** @format */

import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    Unique,
    HasOne,
    HasMany,
    AllowNull,
    Default
} from 'sequelize-typescript'
import { Dialog } from './Dialog'
import { UserChance } from './UserChance'

@Table
export class User extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @Unique
    @Column(DataType.STRING)
    username: string | null

    @Unique
    @Column(DataType.STRING)
    phone: string | null

    @Unique
    @Column(DataType.STRING)
    email: string | null

    @Column(DataType.STRING)
    password: string | null

    @Unique
    @Column(DataType.STRING)
    token: string | null

    @Column(DataType.STRING)
    name: string | null

    @Column(DataType.INTEGER)
    countryCode: number | null

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
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect: boolean

    @HasOne(() => UserChance)
    chance: UserChance

    @HasMany(() => Dialog)
    dialogs: Dialog[]
}

export default () => User
