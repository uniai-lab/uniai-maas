/** @format */
// HTTP response standard format service

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { PassThrough } from 'stream'

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
    error(e: Error, stream: boolean = false) {
        if (stream) {
            const stream = new PassThrough()
            this.ctx.body = stream
            const data: StandardResponse<null> = { status: 0, msg: this.ctx.__(e.message), data: null }
            stream.write(`data: ${JSON.stringify(data)}\n\n`)
            stream.end()
        } else {
            const response: StandardResponse<null> = { status: 0, msg: this.ctx.__(e.message), data: null }
            this.ctx.body = response
        }
    }
    // error with no auth
    noAuth() {
        const response: StandardResponse<null> = {
            status: -1,
            msg: this.ctx.__('No auth to access'),
            data: null
        }
        this.ctx.body = response
    }
}
