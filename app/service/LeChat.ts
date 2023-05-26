/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import { PassThrough } from 'stream'
import $ from '@util/util'

const WEBPAGE_MAX_TOKEN = 1500

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class LeChat extends Service {
    // research online resource
    async searchStream(query: string, searchNum: number = 0, stream?: PassThrough) {
        const { ctx } = this
        const results: string[] = []
        if (!searchNum) return results
        // response data
        const res: StandardResponse<UniAIChatResponseData> = {
            status: 1,
            data: {
                content: '',
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                model: '',
                object: ''
            },
            msg: ''
        }

        // search on google
        res.data.content += `🔍 ${ctx.__('searching')} ${query}\n`
        stream?.write(`data: ${JSON.stringify(res)}\n\n`)
        const { data } = await $.search(query, searchNum)
        const items = data.items || []
        // crawler web page
        for (const item of items) {
            const url = item.link
            const title = item.title
            if (!url) continue
            res.data.content += `${title} ${url}`
            stream?.write(`data: ${JSON.stringify(res)}\n\n`)
            await $.url2text(url)
                .then((text: string) => {
                    res.data.content += ' ✅\n'
                    results.push($.subTokens($.tinyText(text), WEBPAGE_MAX_TOKEN))
                })
                .catch((e: Error) => (res.data.content += ` ❌ ${e.message}\n`))
                .finally(() => stream?.write(`data: ${JSON.stringify(res)}\n\n`))
        }
        res.data.content += `${ctx.__('searched')} ${query} ${ctx.__('done')} 👌\n`
        stream?.write(`data: ${JSON.stringify(res)}\n\n`)

        return results
    }
}
