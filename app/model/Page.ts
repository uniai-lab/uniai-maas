/** @format */

import {
    Table,
    Column,
    AutoIncrement,
    PrimaryKey,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    AllowNull,
    Default
} from 'sequelize-typescript'
import { IndexesOptions } from 'sequelize'
import { Resource } from './Resource'

const indexes: IndexesOptions[] = [{ fields: ['resource_id'] }, { fields: ['is_del'] }, { fields: ['is_effect'] }]

@Table({ indexes })
export class Page extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    page: number

    @AllowNull(false)
    @ForeignKey(() => Resource)
    @Column(DataType.INTEGER)
    resourceId: number

    @AllowNull(false)
    @Default('')
    @Column(DataType.STRING)
    filePath: string

    @AllowNull(false)
    @Default('')
    @Column(DataType.TEXT)
    content: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    tokens: number

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isDel: boolean

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isEffect: boolean

    @BelongsTo(() => Resource)
    resource: Resource
}

export default () => Page
