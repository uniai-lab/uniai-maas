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

    @AllowNull(false)
    @Column(DataType.TEXT)
    description: string | null

    @HasMany(() => Resource)
    resources: Resource[]
}

export default () => ResourceType
