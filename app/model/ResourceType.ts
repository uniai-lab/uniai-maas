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
import { Resource } from './Resource'

@Table
export class ResourceType extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Column(DataType.STRING)
    name: string

    @AllowNull(false)
    @Column(DataType.STRING)
    description: string

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect: boolean

    @HasMany(() => Resource)
    resources: Resource[]
}

export default () => ResourceType
