/** @format */

import { EggContext } from '@eggjs/tegg'
import { UserCache } from '@interface/Cache'

export interface UserContext extends EggContext {
    user?: UserCache
}
