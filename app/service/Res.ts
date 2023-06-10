/** @format */
// HTTP response/result format service

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Res extends Service {
    // success response format
    success<T>(msg: string, data: T) {
        const response: StandardResponse<T> = {
            status: 1,
            msg: this.ctx.__(msg),
            data
        }
        this.ctx.body = response
    }
    // error response format
    error(e: Error) {
        const response: StandardResponse<null> = {
            status: 0,
            msg: this.ctx.__(e.message),
            data: null
        }
        this.ctx.body = response
    }
    // error with no auth
    noAuth() {
        const response: StandardResponse<null> = {
            status: -1,
            msg: this.ctx.__('Not login or login is expired'),
            data: null
        }
        this.ctx.body = response
    }
}
