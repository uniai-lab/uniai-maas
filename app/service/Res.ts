/** @format */
// HTTP response standard format service

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { PassThrough, Readable } from 'stream'
import $ from '@util/util'
import { createParser } from 'eventsource-parser'

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Res extends Service {
    // success response format
    success(msg: string, data: string | object | Readable | null = null) {
        const { ctx } = this
        const res: StandardResponse = { status: 1, msg: ctx.__(msg), data: null }
        if (data instanceof Readable) {
            ctx.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
            // parse stream
            const stream = new PassThrough()
            const parser = createParser(e => {
                if (e.type === 'event') {
                    res.data = $.json(e.data)
                    stream.write(`data: ${JSON.stringify(res)}\n\n`)
                }
            })

            data.on('data', (buff: Buffer) => parser.feed(buff.toString('utf-8')))
            data.on('error', e => {
                res.msg = e.message
                res.status = 0
                stream.write(`data: ${JSON.stringify(res)}\n\n`)
                stream.end()
                // stream.destroy(e)
            })
            data.on('end', () => stream.end())
            data.on('close', () => parser.reset())

            ctx.body = stream
        } else {
            res.data = data
            ctx.body = res
        }
    }
    // error response
    error(e: Error) {
        this.ctx.body = { status: 0, msg: this.ctx.__(e.message), data: null }
    }
    // error response because of no auth
    noAuth() {
        this.ctx.body = { status: -1, msg: this.ctx.__('No auth to access'), data: null }
    }
}
