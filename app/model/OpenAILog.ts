/** @format */

import { Table, Column, AutoIncrement, PrimaryKey, Model, DataType, AllowNull, Default } from 'sequelize-typescript'

@Table({ modelName: 'open_ai_log' })
export class OpenAILog extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Column(DataType.STRING)
    object: string

    @AllowNull(false)
    @Column(DataType.STRING)
    model: string

    @AllowNull(false)
    @Column(DataType.INTEGER)
    userId: number

    @AllowNull(false)
    @Column(DataType.TEXT)
    message: string

    @Default(0)
    @AllowNull(false)
    @Column(DataType.INTEGER)
    promptTokens: number

    @Default(0)
    @AllowNull(false)
    @Column(DataType.INTEGER)
    totalTokens: number
}

export default () => OpenAILog
