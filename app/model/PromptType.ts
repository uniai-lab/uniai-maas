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
import { Prompt } from './Prompt'

@Table
export class PromptType extends Model {
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

    @HasMany(() => Prompt)
    prompts: Prompt[]
}

export default () => PromptType
