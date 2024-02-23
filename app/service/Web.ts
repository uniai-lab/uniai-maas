/** @format */

import { Service } from 'egg'
import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Op } from 'sequelize'
import { PassThrough, Readable } from 'stream'
import { randomUUID } from 'crypto'
import md5 from 'md5'
import {
    ChatMessage,
    ChatModel,
    ChatRoleEnum,
    ChatModelProvider,
    EmbedModelProvider,
    ImagineModelProvider,
    ImagineModel
} from 'uniai'
import { ConfigMenuV2, ConfigVIP } from '@interface/Config'
import { ChatResponse } from '@interface/controller/WeChat'
import { WXAppQRCodeCache } from '@interface/Cache'
import ali from '@util/aliyun'
import $ from '@util/util'

const SMS_WAIT = 1 * 60 * 1000
const SMS_EXPIRE = 5 * 60 * 1000
const SMS_COUNT = 5
const CHAT_PAGE_SIZE = 10
const CHAT_MAX_PAGE = 20
const PAGE_LIMIT = 6

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Web extends Service {
    // get config value by key
    async getConfig<T = string>(key: string) {
        return await this.service.uniAI.getConfig<T>(key)
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

    async updateUser(
        id: number,
        obj: {
            name?: string
            avatar?: string
            password?: string
        }
    ) {
        const user = await this.ctx.model.User.findByPk(id)
        if (!user) throw new Error('User not found')
        const { password, name, avatar } = obj
        // set password
        if (password && user.phone) user.password = md5(`${user.id}${password}${user.createdAt}`)
        if (name) user.name = name
        if (avatar) user.avatar = avatar
        return await user.save()
    }

    // send SMS code
    async sendSMSCode(phone: string) {
        const { ctx } = this
        const count = await ctx.model.PhoneCode.count({
            where: { phone, createdAt: { [Op.gte]: new Date(Date.now() - SMS_WAIT) } }
        })
        if (count) throw new Error('Too many times request SMS code')

        const code = Math.floor(Math.random() * 900000) + 100000
        const data = await ali.sendCode(phone, code)
        const expire = Math.floor(Date.now() / 1000 + SMS_EXPIRE)
        return await ctx.model.PhoneCode.create({ phone, code, data, expire })
    }

    // generate WeChat mini app QR code
    async getQRCode() {
        const token = md5(`${randomUUID()}${Date.now()}`).substring(0, 24)
        const code = await this.service.weChat.getQRCode('pages/index/index', `token=${token}`)
        if (!code) throw new Error('Fail to generate QR Code')
        return { token, code, time: Date.now() }
    }

    // verify QR Code token
    async verifyQRCode(token: string) {
        const res = $.json<WXAppQRCodeCache>(await this.app.redis.getex(`wx_app_qrcode_${token}`))
        if (res && res.token) await this.app.redis.del(`wx_app_qrcode_${token}`)
        return res
    }

    // login
    async login(phone: string, code?: string, password?: string, fid?: number) {
        const { ctx } = this
        // password login
        if (password) {
            const user = await ctx.model.User.findOne({ where: { phone }, attributes: ['id', 'password', 'createdAt'] })
            if (!user) throw new Error('Can not find the phone number')
            if (user.password !== md5(`${user.id}${password}${user.createdAt}`)) throw new Error('Invalid password')
            return await ctx.service.user.signIn(user.id)
        }
        // code login
        else if (code) {
            const res = await ctx.model.PhoneCode.findOne({
                where: { phone, createdAt: { [Op.gte]: new Date(Date.now() - SMS_EXPIRE) } },
                order: [['id', 'DESC']]
            })
            if (!res) throw new Error('Can not find the phone number')
            await res.increment('count')

            // validate code
            if (res.count >= SMS_COUNT) throw new Error('Try too many times')
            if (res.code !== code) throw new Error('Code is invalid')

            // find user and sign in
            const { id } =
                (await ctx.model.User.findOne({ where: { phone }, attributes: ['id'] })) ||
                (await ctx.service.user.create(phone, null, fid))

            // add free chat dialog if not existed
            if (!(await ctx.model.Dialog.count({ where: { userId: id, resourceId: null } })))
                await ctx.service.weChat.addDialog(id)

            return await ctx.service.user.signIn(id)
        } else throw new Error('Need phone code or password')
    }

    // list all the chats from a user and dialog
    async listChat(userId: number, dialogId?: number, lastId?: number, pageSize: number = CHAT_PAGE_SIZE) {
        const { ctx } = this
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId ? { id: dialogId, userId } : { resourceId: null, userId },
            attributes: ['id']
        })
        if (!dialog) throw new Error('Can not find dialog')

        const res = await ctx.model.Chat.findAll({
            limit: pageSize > CHAT_MAX_PAGE ? CHAT_MAX_PAGE : pageSize,
            order: [['id', 'DESC']],
            where: {
                dialogId: dialog.id,
                id: lastId ? { [Op.lt]: lastId } : { [Op.lte]: await ctx.model.Chat.max('id') },
                isDel: false,
                isEffect: true
            }
        })

        return res.reverse()
    }

    async selectModel(input: string) {
        const prompt: ChatMessage[] = [
            { role: ChatRoleEnum.USER, content: `${input}\n${await this.getConfig('PROMPT_MODEL_SELECT')}` }
        ]
        const res = await this.ctx.service.uniAI.chat(prompt, false, ChatModelProvider.GLM, ChatModel.GLM_6B, 1, 0)
        if (res instanceof Readable) throw new Error('Chat response is stream')
        console.log(res)
        return parseInt(res.content)
    }
    async translate(input: string) {
        const prompt: ChatMessage[] = [{ role: ChatRoleEnum.USER, content: 'Translate to English:' + input }]
        const res = await this.ctx.service.uniAI.chat(prompt)
        if (res instanceof Readable) throw new Error('Chat response is stream')
        return res.content
    }

    // sse chat
    async chat(
        userId: number,
        input: string,
        prompt: string = '',
        assistant: string = '',
        dialogId: number = 0,
        provider: ChatModelProvider = ChatModelProvider.IFlyTek,
        model: ChatModel = ChatModel.SPARK_V3
    ) {
        const { ctx } = this

        const output = new PassThrough()
        const data: ChatResponse = {
            chatId: 0,
            role: ChatRoleEnum.ASSISTANT,
            content: '',
            dialogId,
            resourceId: 0,
            model: provider,
            subModel: model,
            avatar: await ctx.service.weChat.getConfig('DEFAULT_AVATAR_AI'),
            isEffect: true
        }

        data.content = ctx.__('selecting model for user')
        output.write(JSON.stringify(data))

        this.selectModel(input)
            .then(select => {
                switch (select) {
                    case 1:
                        return this.doChat(userId, dialogId, input, prompt, assistant, provider, model, data, output)
                    case 2:
                        return this.doImagine(userId, dialogId, input, data, output)
                    default:
                        return this.doChat(userId, dialogId, input, prompt, assistant, provider, model, data, output)
                }
            })
            .catch((e: Error) => output.destroy(e))

        return output as Readable
    }

    async doChat(
        userId: number,
        dialogId: number,
        input: string,
        prompt: string = '',
        assistant: string = '',
        provider: ChatModelProvider = ChatModelProvider.IFlyTek,
        model: ChatModel = ChatModel.SPARK_V3,
        data: ChatResponse,
        output: PassThrough
    ) {
        const { ctx } = this

        // check user chat chance
        const user = await ctx.model.User.findByPk(userId, { attributes: ['id', 'chatChanceFree', 'chatChance'] })
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree + user.chatChance <= 0) throw new Error('Chat chance not enough')

        // find dialog (default dialog) and chat history
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId ? { id: dialogId, userId } : { resourceId: null, userId },
            attributes: ['id', 'resourceId'],
            include: {
                model: ctx.model.Chat,
                limit: CHAT_PAGE_SIZE,
                order: [['id', 'desc']],
                attributes: ['role', 'content'],
                where: { isDel: false, isEffect: true }
            }
        })

        if (!dialog) throw new Error('Dialog is not available')
        dialog.chats.reverse()
        dialogId = dialog.id
        const resourceId = dialog.resourceId
        const { USER, SYSTEM, ASSISTANT } = ChatRoleEnum
        const prompts: ChatMessage[] = []

        // initial system and assistant prompt
        prompt = prompt || (await this.getConfig('SYSTEM_PROMPT'))
        prompts.push({ role: SYSTEM, content: ctx.__('Prompt', prompt) })
        if (assistant) prompts.push({ role: ASSISTANT, content: assistant })

        // add reference resource
        if (resourceId) {
            let content = ctx.__('document content start')
            // query resource
            const pages = await ctx.service.uniAI.queryResource(
                [{ role: USER, content: input }],
                resourceId,
                EmbedModelProvider.Other,
                PAGE_LIMIT
            )
            // add resource to prompt
            for (const item of pages) content += `\n${item.content}`
            content += `\n${ctx.__('document content end')}\n${ctx.__('answer according to')}`
            prompts.push({ role: SYSTEM, content })
        }

        // add history chat
        for (const { role, content } of dialog.chats) prompts.push({ role, content })

        // add user chat
        prompts.push({ role: USER, content: input })

        // start chat stream
        const res = await ctx.service.uniAI.chat(prompts, true, provider, model)
        if (!(res instanceof Readable)) throw new Error('Chat stream is not readable')

        data.content = ''
        output.write(JSON.stringify(data))

        res.on('data', (buff: Buffer) => {
            const obj = $.json<ChatResponse>(buff.toString())
            if (obj && obj.content) {
                data.content += obj.content
                data.subModel = obj.model
                output.write(JSON.stringify(data))
            }
        })
        res.on('end', async () => {
            // save user chat
            if (input)
                await ctx.model.Chat.create({
                    dialogId,
                    role: USER,
                    content: input,
                    model: data.model,
                    subModel: data.subModel
                })
            // save assistant chat
            if (data.content) {
                const chat = await ctx.model.Chat.create({
                    dialogId,
                    role: ASSISTANT,
                    content: data.content,
                    model: data.model,
                    subModel: data.subModel
                })
                data.chatId = chat.id
            }
            // reduce user chat chance
            if (user.chatChanceFree > 0) user.chatChanceFree--
            else if (user.chatChance > 0) user.chatChance--
            await user.save()
            output.end(JSON.stringify(data))
        })
        res.on('error', e => output.destroy(e))
    }

    async doImagine(userId: number, dialogId: number, input: string, data: ChatResponse, output: PassThrough) {
        const { ctx } = this
        data.model = ImagineModelProvider.MidJourney
        data.subModel = ImagineModel.MJ
        data.content = ctx.__('system detect imagine task')
        output.write(JSON.stringify(data))

        // check user chat chance
        const user = await ctx.model.User.findByPk(userId, { attributes: ['id', 'chatChanceFree', 'chatChance'] })
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree + user.chatChance <= 0) throw new Error('Chat chance not enough')

        // find dialog (default dialog) and chat history
        const dialog = await ctx.model.Dialog.findOne({
            where: dialogId ? { id: dialogId, userId } : { resourceId: null, userId },
            attributes: ['id']
        })
        if (!dialog) throw new Error('Dialog is not available')
        dialogId = dialog.id

        // translate to english
        // imagine
        const res = await ctx.service.uniAI.imagine(
            await this.translate(input),
            '',
            1,
            1024,
            1024,
            data.model,
            data.subModel as ImagineModel
        )
        // watch task
        while (true) {
            const task = await this.ctx.service.uniAI.task(res.taskId, data.model as ImagineModelProvider)
            if (!task[0]) throw new Error('Task not found')
            if (task[0].fail) throw new Error(task[0].fail)

            console.log(task)

            const img = task[0].imgs[0]
            const url = img
                ? this.service.weChat.url(await $.putOSS(img), Date.now() + '.png')
                : 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/giphy.gif'
            const markdown = `<img src="${url}" width="${img ? '400px' : '50px'}"/>`
            data.content = `${markdown}\n${ctx.__('imagining')}${task[0].progress}%`
            data.subModel = task[0].model
            output.write(JSON.stringify(data))

            const progress = task[0].progress

            if (isNaN(progress)) throw new Error('Can not get task progress')

            if (progress === 100) {
                // save user chat
                if (input)
                    await ctx.model.Chat.create({
                        dialogId,
                        role: ChatRoleEnum.USER,
                        content: input,
                        model: data.model,
                        subModel: data.subModel
                    })
                // save assistant chat
                if (data.content) {
                    data.content = markdown
                    const chat = await ctx.model.Chat.create({
                        dialogId,
                        role: ChatRoleEnum.ASSISTANT,
                        content: data.content,
                        model: data.model,
                        subModel: data.subModel
                    })
                    data.chatId = chat.id
                }
                // reduce user chance
                if (user.chatChanceFree > 0) user.chatChanceFree--
                else if (user.chatChance > 0) user.chatChance--
                await user.save()

                output.end(JSON.stringify(data))
                break
            }
            if (!progress) await $.sleep(3000)
        }
    }
}
