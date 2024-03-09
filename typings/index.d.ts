/** @format */

import 'egg'
import { UserCache } from '@interface/Cache'
import { Transaction } from 'sequelize'

declare module 'egg' {
    interface Context {
        user?: UserCache
        transaction?: Transaction
    }
}
