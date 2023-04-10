/** @format
 * Prompt Templates
 */

import {
    Column,
    DataType,
    Table,
    Model,
    Comment,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    Default
} from 'sequelize-typescript'

@Table({ modelName: 'prompt' })
export class Prompt extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Column(DataType.TEXT)
    content!: string

    @Column({
        type: `VECTOR(${process.env.OPENAI_EMBED_DIM})`,
        get(): number[] {
            return JSON.parse(this.getDataValue('embedding'))
        },
        set(value: number[]) {
            this.setDataValue('embedding', JSON.stringify(value))
        }
    })
    embedding: number[]

    static async similarFindAll(vector: number[], limit: number, distance?: number) {
        const db = this.sequelize
        return await this.findAll({
            order: db?.literal(`embedding <=> '${JSON.stringify(vector)}' ASC`),
            where: distance ? db?.literal(`embedding <=> '${JSON.stringify(vector)}' < ${distance}`) : undefined,
            limit
        })
    }

    @Comment('1:Template')
    @AllowNull(false)
    @Default(1)
    @Column(DataType.INTEGER)
    type: number
}

export default () => Prompt
