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

@Table({ modelName: 'user' })
export class User extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @Column(DataType.STRING)
    name: string

    @Unique
    @Column(DataType.STRING)
    phone: string

    @Unique
    @Column(DataType.STRING)
    email: string

    @Column(DataType.INTEGER)
    countryCode: number

    @Unique
    @Column(DataType.STRING)
    username: string

    @Column(DataType.STRING)
    password: string

    @Column(DataType.STRING)
    avatar: string

    @Unique
    @Column(DataType.STRING)
    token: string

    @Column(DataType.DATE)
    tokenTime: Date

    @Unique
    @Column(DataType.STRING)
    wxOpenId: string

    @Unique
    @Column(DataType.STRING)
    wxPublicOpenId: string

    @Unique
    @Column(DataType.STRING)
    wxUnionId: string

    @Column(DataType.STRING)
    wxSessionKey: string

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel!: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect!: boolean

    @HasOne(() => UserChance)
    chance: UserChance

    @HasMany(() => Dialog)
    dialogs: Dialog[]
}

export default () => User
