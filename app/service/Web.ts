/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { ChatModelEnum, ChatRoleEnum, EmbedModelEnum, ModelProvider } from '@interface/Enum'
import { ChatMessage } from '@interface/controller/UniAI'
import { ChatResponse, ConfigMenuV2, ConfigVIP } from '@interface/controller/WeChat'
import { Service } from 'egg'
import { createParser } from 'eventsource-parser'
import { Op } from 'sequelize'
import { PassThrough, Readable } from 'stream'
import $ from '@util/util'
import ali from '@util/aliyun'

const LIMIT_SMS_WAIT = 1 * 60 * 1000
const LIMIT_SMS_EXPIRE = 5 * 60 * 1000
const LIMIT_SMS_COUNT = 5
const CHAT_PAGE_SIZE = 10
const PAGE_LIMIT = 6

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Web extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        return await this.ctx.service.uniAI.getConfig<T>(key)
    }

    // get all user needed configs
    async getUserConfig() {
        return {
            appName: await this.getConfig('APP_NAME'),
            appVersion: await this.getConfig('APP_VERSION'),
            footer: await this.getConfig('FOOT_TIP'),
            footerCopy: await this.getConfig('FOOT_COPY'),
            officialAccount: await this.getConfig('OFFICIAL'),
            vip: await this.getConfig<ConfigVIP[]>('USER_VIP'),
            menuMember: await this.getConfig<ConfigMenuV2>('USER_MENU_MEMBER'),
            menuInfo: await this.getConfig<ConfigMenuV2>('USER_MENU_INFO'),
            menuShare: await this.getConfig<ConfigMenuV2>('USER_MENU_SHARE'),
            menuFocus: await this.getConfig<ConfigMenuV2>('USER_MENU_FOCUS'),
            menuAdv: await this.getConfig<ConfigMenuV2>('USER_MENU_ADV')
        }
    }

    // send SMS code
    async sendSMSCode(phone: string) {
        const { ctx } = this
        const count = await ctx.model.PhoneCode.count({
            where: { phone, createdAt: { [Op.gte]: new Date(Date.now() - LIMIT_SMS_WAIT) } }
        })
        if (count) throw new Error('Too many times request SMS code')

        const code = Math.floor(Math.random() * 900000) + 100000
        const data = await ali.sendCode(phone, code)
        console.log(data)
        const expire = Math.floor(Date.now() / 1000 + LIMIT_SMS_EXPIRE)
        return await ctx.model.PhoneCode.create({ phone, code, data, expire })
    }

    // login
    async login(phone: string, code: string, fid?: number) {
        const { ctx } = this
        const res = await ctx.model.PhoneCode.findOne({
            where: { phone, createdAt: { [Op.gte]: new Date(Date.now() - LIMIT_SMS_EXPIRE) } },
            order: [['id', 'DESC']]
        })
        if (!res) throw new Error('Can not find the phone number')
        await res.increment('count')

        // validate code
        if (res.count >= LIMIT_SMS_COUNT) throw new Error('Try too many times')
        if (res.code !== code) throw new Error('Code is invalid')

        // find user and sign in
        const { id } =
            (await ctx.model.User.findOne({ where: { phone }, attributes: ['id'] })) ||
            (await ctx.service.user.create(phone, null, fid))
        return await ctx.service.user.signIn(id)
    }

    // sse chat
    async chat(
        userId: number,
        input: string,
        role: string = '',
        prompt: string = '',
        dialogId: number = 0,
        model: ModelProvider = ModelProvider.IFlyTek,
        subModel?: ChatModelEnum
    ) {
        const { ctx } = this

        // check user chat chance
        const user = await ctx.model.UserChance.findOne({ where: { userId } })
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree + user.chatChance <= 0) throw new Error('Chance of chat not enough')

        // dialogId ? dialog chat : free chat
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId
                ? { id: dialogId, userId, isEffect: true, isDel: false }
                : { resourceId: null, userId, isEffect: true, isDel: false },
            include: {
                model: ctx.model.Chat,
                limit: CHAT_PAGE_SIZE,
                order: [['id', 'desc']],
                where: { isEffect: true, isDel: false }
            }
        })
        if (!dialog) throw new Error('Dialog is not available')
        dialog.chats.reverse()
        dialogId = dialog.id

        const { USER, SYSTEM, ASSISTANT } = ChatRoleEnum
        const prompts: ChatMessage[] = []

        role = role || (await this.getConfig('SYSTEM_NAME'))
        prompt = prompt || (await this.getConfig('SYSTEM_PROMPT'))
        prompts.push({
            role: SYSTEM,
            content: `${ctx.__('Role', role)}\n${ctx.__('Prompt', prompt)}\n${ctx.__('Language')}`
        })

        // add user chat history
        for (const { role, content } of dialog.chats) prompts.push({ role, content } as ChatMessage)

        // add related resource
        const resourceId = dialog.resourceId
        if (resourceId) {
            let content = ctx.__('document content start')
            // query resource
            const pages = await ctx.service.uniAI.queryResource(
                [{ role: USER, content: input }],
                resourceId,
                EmbedModelEnum.TextVec,
                PAGE_LIMIT
            )
            // add resource to prompt
            for (const item of pages) content += `\n${item.content}`
            content += `\n${ctx.__('document content end')}\n${ctx.__('answer according to')}`
            prompts.push({ role: SYSTEM, content })
        }

        prompts.push({ role: USER, content: input })
        console.log(prompts)

        // save user prompt
        await ctx.model.Chat.create({ dialogId, role: USER, content: input })

        // start chat stream
        const stream = await ctx.service.uniAI.chat(prompts, true, model, subModel)
        if (!(stream instanceof Readable)) throw new Error('Chat stream is not readable')

        // filter sensitive
        const data: ChatResponse = {
            chatId: 0,
            role: ChatRoleEnum.ASSISTANT,
            content: '',
            dialogId,
            resourceId,
            model,
            subModel: subModel || null,
            avatar: await ctx.service.weChat.getConfig('DEFAULT_AVATAR_AI'),
            isEffect: true
        }
        const output = new PassThrough()

        const parser = createParser(e => {
            if (e.type === 'event') {
                const obj = $.json<ChatResponse>(e.data)
                if (obj && obj.content) {
                    data.content += obj.content
                    data.subModel = obj.model
                    output.write(`data: ${JSON.stringify(data)}\n\n`)
                }
            }
        })

        // add listen stream
        stream.on('data', (buff: Buffer) => parser.feed(buff.toString('utf-8')))
        stream.on('error', e => output.destroy(e))
        stream.on('end', async () => {
            if (user.chatChanceFree > 0) await user.decrement({ chatChanceFree: 1 })
            else await user.decrement({ chatChance: 1 })
            ctx.service.user.updateUserCache(user.userId)
        })
        stream.on('close', async () => {
            parser.reset()
            // save assistant response
            if (data.content) {
                const chat = await ctx.model.Chat.create({
                    dialogId: data.dialogId,
                    resourceId: data.resourceId,
                    role: ASSISTANT,
                    content: data.content,
                    model: data.model,
                    subModel: data.subModel,
                    isEffect: data.isEffect
                })
                data.chatId = chat.id
            }
            output.end(`data: ${JSON.stringify(data)}\n\n`)
        })
        return output as Readable
    }
}
