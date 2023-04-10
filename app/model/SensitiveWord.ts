/** @format
 * Sensitive words to forbid
 */

import {
    Column,
    DataType,
    Table,
    Model,
    Comment,
    Unique,
    PrimaryKey,
    AutoIncrement,
    AllowNull
} from 'sequelize-typescript'

@Table({ modelName: 'sensitive_word' })
export class SensitiveWord extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number

    @AllowNull(false)
    @Unique
    @Column(DataType.STRING)
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

    @AllowNull(false)
    @Comment('1:Porn, 2:Politics, 3:Violence, 4:Website, 5:Advertisement')
    @Column(DataType.INTEGER)
    type!: number
}

export default () => SensitiveWord
