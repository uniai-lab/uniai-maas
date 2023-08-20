/** @format */

import {
    Table,
    Column,
    AutoIncrement,
    PrimaryKey,
    Model,
    DataType,
    Unique,
    HasMany,
    AllowNull,
    Default
} from 'sequelize-typescript'
import { Resource } from './Resource'

@Table({ modelName: 'resource_type' })
export class ResourceType extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    type: string

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
