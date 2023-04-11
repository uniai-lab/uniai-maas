/** @format */

import { EggContext } from '@eggjs/tegg'
import { Transaction } from 'sequelize'

export interface UserContext extends EggContext {
    userId?: number
    transaction?: Transaction
}
