/** @format */
// HTTP response standard format service

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { PassThrough, Readable } from 'stream'
import { createParser } from 'eventsource-parser'
import $ from '@util/util'
import { basename, extname } from 'path'

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Res extends Service {
    // success response format
    success(msg: string, data: string | object | Readable | null = null) {
        const { ctx } = this
        const res: StandardResponse = { status: 1, msg: ctx.__(msg), data }
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
        } else ctx.body = res
    }
    file(data: Readable, name: string) {
        const { ctx } = this
        ctx.response.type = extname(name)
        ctx.set('Content-Disposition', `filename=${encodeURIComponent(name)}`) // 强制浏览器下载，设置下载的文件名
        ctx.body = data
    }
    // error response
    error(e: Error) {
        this.ctx.body = { status: 0, msg: this.ctx.__(e.message), data: null } as StandardResponse
    }
    // error response because of no auth
    noAuth() {
        this.ctx.body = { status: -1, msg: this.ctx.__('Invalid user access'), data: null } as StandardResponse
    }
}
