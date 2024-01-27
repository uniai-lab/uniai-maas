/** @format */
// HTTP response standard format service

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { PassThrough, Readable } from 'stream'
import { extname } from 'path'
import $ from '@util/util'

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Res extends Service {
    // success response format
    success(msg: string, data: string | object | Readable | null = null) {
        const { ctx } = this
        const res: StandardResponse = { status: 1, msg: ctx.__(msg), data }
        if (data instanceof Readable) {
            ctx.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })

            const output = new PassThrough()
            data.on('data', (buff: Buffer) => {
                res.data = $.json(buff.toString())
                output.write(`data: ${JSON.stringify(res)}\n\n`)
            })

            data.on('error', e => {
                res.status = 0
                res.msg = e.message
                res.data = null
                output.end(`data: ${JSON.stringify(res)}\n\n`)
            })
            data.on('end', () => output.end())

            ctx.body = output
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
