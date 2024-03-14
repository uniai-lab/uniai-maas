/** @format */

import { Service } from 'egg'
import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Op } from 'sequelize'
import { PassThrough, Readable } from 'stream'
import { randomUUID } from 'crypto'
import md5 from 'md5'
import { EggFile } from 'egg-multipart'
import { basename, extname } from 'path'
import { statSync } from 'fs'
import {
    ChatMessage,
    ChatModel,
    ChatRoleEnum,
    ChatModelProvider,
    EmbedModelProvider,
    ImagineModelProvider,
    ImagineModel
} from 'uniai'
import { ConfigVIP, LevelChatProvider, LevelImagineModel } from '@interface/Config'
import { ChatResponse } from '@interface/controller/Web'
import { WXAppQRCodeCache } from '@interface/Cache'
import { OutputMode, ResourceType } from '@interface/Enum'
import ali from '@util/aliyun'
import $ from '@util/util'

const SMS_WAIT = 1 * 60 * 1000
const SMS_EXPIRE = 5 * 60 * 1000
const SMS_COUNT = 5
const CHAT_PAGE_SIZE = 10 // chat default page size
const CHAT_PAGE_LIMIT = 20 // chat max page size
const DIALOG_PAGE_SIZE = 10 // dialog default page size
const DIALOG_PAGE_LIMIT = 20 // dialog max page size
const LOOP_MAX = 600 // imagine task request max loop
const LOOP_WAIT = 1000 // imagine task request interval, ms

const TITLE_SUB_TOKEN = 20 // dialog title limit length
const QUERY_PAGE_LIMIT = 5 // query resource page limit
const LOAD_IMG = 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/giphy.gif'

const IMAGINE_COST = 10
const CHAT_COST = 1
const LIMIT_IMG_SIZE = 2 * 1024 * 1024 // images over 2mb need to compress

const TRANSLATE_PROVIDER = ChatModelProvider.OpenAI
const TRANSLATE_MODEL = ChatModel.GPT3

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
            vip: await this.getConfig<ConfigVIP[]>('USER_VIP')
        }
    }

    // update user info
    async updateUser(id: number, obj: { name?: string; avatar?: string; password?: string }) {
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
        const { transaction } = ctx
        // password login
        if (password) {
            const user = await ctx.model.User.findOne({
                where: { phone },
                attributes: ['id', 'password', 'createdAt'],
                transaction
            })
            if (!user) throw new Error('Can not find the phone number')
            if (user.password !== md5(`${user.id}${password}${user.createdAt}`)) throw new Error('Invalid password')
            return await ctx.service.user.signIn(user.id)
        }
        // code login
        else if (code) {
            const res = await ctx.model.PhoneCode.findOne({
                where: { phone, createdAt: { [Op.gte]: new Date(Date.now() - SMS_EXPIRE) } },
                order: [['id', 'DESC']],
                transaction
            })
            if (!res) throw new Error('Can not find the phone number')
            // limit code request times
            await res.increment('count', { transaction })
            if (res.count >= SMS_COUNT) throw new Error('Try too many times')
            if (res.code !== code) throw new Error('Code is invalid')

            // find or create user
            const { id } = await ctx.service.user.findOrCreate({ phone }, fid)

            // add a default free chat dialog if not existed
            const count = await ctx.model.Dialog.count({
                where: { userId: id, resourceId: null, isEffect: true, isDel: false },
                transaction
            })
            if (!count) await this.addDialog(id)

            // sign in
            return await ctx.service.user.signIn(id)
        } else throw new Error('Need phone code or password')
    }

    // find or add a dialog
    async addDialog(userId: number) {
        const { ctx } = this
        const { transaction } = ctx

        // create a new dialog and a chat message
        const content = ctx.__('Im AI model') + ctx.__('feel free to chat')
        return await ctx.model.Dialog.create(
            { userId, chats: [{ role: ChatRoleEnum.ASSISTANT, content }] },
            { include: ctx.model.Chat, transaction }
        )
    }

    // delete a dialog
    async delDialog(userId: number, id: number) {
        const { ctx } = this
        const { transaction } = ctx

        // find dialog
        const dialog = await ctx.model.Dialog.findOne({ where: { id, userId }, transaction })
        if (!dialog) throw new Error('Can not find the dialog')

        // delete dialog
        dialog.isDel = true
        await dialog.save({ transaction })
        await ctx.model.Chat.update({ isDel: true }, { where: { dialogId: dialog.id }, transaction })

        // keep one fresh dialog
        const count = await ctx.model.Dialog.count({
            where: { userId, resourceId: null, isEffect: true, isDel: false },
            transaction
        })
        if (count <= 0) await this.addDialog(userId)
    }

    // list user all dialogs
    async listDialog(userId: number, id: number = 0, lastId: number = 0, pageSize: number = DIALOG_PAGE_SIZE) {
        const { ctx } = this

        return await ctx.model.Dialog.findAll({
            where: {
                id: id || (lastId ? { [Op.lt]: lastId } : { [Op.lte]: await ctx.model.Dialog.max('id') }),
                resourceId: null,
                userId,
                isEffect: true,
                isDel: false
            },
            attributes: ['id', 'title', 'updatedAt', 'createdAt'],
            order: [['id', 'DESC']],
            limit: pageSize > DIALOG_PAGE_LIMIT ? DIALOG_PAGE_LIMIT : pageSize
        })
    }

    // list all the chats from a user dialog
    async listChat(
        userId: number,
        dialogId: number,
        id: number = 0,
        lastId: number = 0,
        pageSize: number = CHAT_PAGE_SIZE
    ) {
        const { ctx } = this
        const count = await ctx.model.Dialog.count({ where: { id: dialogId, userId, isEffect: true, isDel: false } })
        if (!count) throw new Error('Can not find dialog')

        const res = await ctx.model.Chat.findAll({
            limit: pageSize > CHAT_PAGE_LIMIT ? CHAT_PAGE_LIMIT : pageSize,
            order: [['id', 'DESC']],
            where: {
                dialogId,
                id: id || (lastId ? { [Op.lt]: lastId } : { [Op.lte]: await ctx.model.Chat.max('id') }),
                isDel: false,
                isEffect: true
            },
            include: {
                model: ctx.model.Resource,
                attributes: ['fileName', 'fileSize', 'fileExt', 'filePath', 'typeId']
            }
        })

        return res.reverse()
    }

    // sse chat
    async chat(
        dialogId: number,
        userId: number,
        input: string,
        system: string = '',
        assistant: string = '',
        provider: ChatModelProvider | ImagineModelProvider | null = null,
        model: ChatModel | ImagineModel | null = null,
        mode = OutputMode.AUTO
    ) {
        const { ctx } = this

        // check dialog is right
        const dialog = await ctx.model.Dialog.findOne({
            where: { id: dialogId, userId, isEffect: true, isDel: false },
            attributes: ['id', 'title']
        })
        if (!dialog) throw new Error('Dialog is not available')

        // update title
        if (!dialog.title) await dialog.update({ title: $.subTokens(input, TITLE_SUB_TOKEN) })

        const data: ChatResponse = {
            chatId: 0,
            userId,
            dialogId,
            role: ChatRoleEnum.ASSISTANT,
            content: '',
            resourceId: 0,
            model: provider,
            subModel: model,
            avatar: await ctx.service.weChat.getConfig('DEFAULT_AVATAR_AI'),
            file: null,
            isEffect: true
        }
        const output: PassThrough = new PassThrough()

        this.useOutputMode(input, mode, data, output)
            .then(select => {
                switch (select) {
                    case 1:
                        return this.doChat(input, system, assistant, data, output)
                    case 2:
                        return this.doImagine(input, data, output)
                    default:
                        return this.doChat(input, system, assistant, data, output)
                }
            })
            .catch((e: Error) => {
                console.error(e)
                output.destroy(e)
            })

        return output as Readable
    }

    /**
     * Selects an output mode, either image or text
     * @param input Input string
     * @param mode Output mode
     * @param data Chat response data
     * @param output PassThrough stream for output
     */
    async useOutputMode(input: string, mode: OutputMode, data: ChatResponse, output: PassThrough) {
        if (mode) return mode

        const { ctx } = this

        // send message to front, auto selecting mode
        data.content = this.ctx.__('selecting model for user')
        output.write(JSON.stringify(data))

        const prompt = [
            { role: ChatRoleEnum.USER, content: `${input}\n${await this.getConfig('PROMPT_MODEL_SELECT')}` }
        ]
        const res = await this.ctx.service.uniAI.chat(prompt, false, ChatModelProvider.GLM, ChatModel.GLM_6B, 1, 0)
        if (res instanceof Readable) throw new Error('Chat response is stream')
        mode = parseInt(res.content)

        // send message to front mode is selected
        if (mode === OutputMode.IMAGE) {
            data.content = ctx.__('system detect imagine task')
            output.write(JSON.stringify(data))
        }
        return mode
    }

    /**
     * Auto select a chat model based on user messages
     * @param messages Chat messages
     * @param level User level
     * @param exts Array of file extensions, defaults to an empty array
     */
    async useChatModel(messages: ChatMessage[], level: number, exts: string[]) {
        // level options and count tokens
        const options = await this.getConfig<LevelChatProvider>('LEVEL_CHAT_PROVIDER')
        const count = messages.reduce((acc, v) => (acc += $.countTokens(v.content)), 0)

        // default provider and model
        let provider: ChatModelProvider | null = null
        let model: ChatModel | null = null

        // 6k
        if (count < 6000) {
            if (level >= options.iflytek) {
                provider = ChatModelProvider.IFlyTek
                model = ChatModel.SPARK_V3
            }
        }
        // 8k input
        else if (count >= 6000 && count < 8000) {
            if (level >= options.glm) {
                provider = ChatModelProvider.GLM
                model = ChatModel.GLM_3_TURBO
            }
            if (level >= options.moonshot) {
                provider = ChatModelProvider.MoonShot
                model = ChatModel.MOON_V1_8K
            }
            if (level >= options.openai) {
                provider = ChatModelProvider.OpenAI
                model = ChatModel.GPT3
            }
        }
        // 16k input
        else if (count >= 8000 && count < 16000) {
            if (level >= options.moonshot) {
                provider = ChatModelProvider.MoonShot
                model = ChatModel.MOON_V1_32K
            }
            if (level >= options.google) {
                provider = ChatModelProvider.Google
                model = ChatModel.GEM_PRO
            }
            if (level >= options.openai) {
                provider = ChatModelProvider.OpenAI
                model = ChatModel.GPT3_16K
            }
        }
        // 32k input
        else if (count >= 16000 && count < 32000) {
            if (level >= options.moonshot) {
                provider = ChatModelProvider.MoonShot
                model = ChatModel.MOON_V1_32K
            }
            if (level >= options.openai) {
                provider = ChatModelProvider.OpenAI
                model = ChatModel.GPT4_TURBO
            }
        }
        // 128k input
        else if (count >= 32000 && count < 128000) {
            if (level >= options.moonshot) {
                provider = ChatModelProvider.MoonShot
                model = ChatModel.MOON_V1_128K
            }
            if (level >= options.openai) {
                provider = ChatModelProvider.OpenAI
                model = ChatModel.GPT4_TURBO
            }
        } else throw new Error('Context is too long')

        // handle excel table
        if (exts.includes('xlsx') || exts.includes('xls') || exts.includes('csv')) {
            if (level >= options.openai) {
                provider = ChatModelProvider.OpenAI
                model = count < 8000 ? ChatModel.GPT4 : ChatModel.GPT4_TURBO
            }
        }

        // handle image chat
        if (messages.some(v => v.img)) {
            if (level >= options.glm) {
                provider = ChatModelProvider.GLM
                model = ChatModel.GLM_4V
            }
            if (level >= options.google) {
                provider = ChatModelProvider.Google
                model = ChatModel.GEM_VISION
            }
            if (level >= options.openai) {
                provider = ChatModelProvider.OpenAI
                model = ChatModel.GPT4_VISION
            }
        }
        if (!provider || !model) throw new Error('Context is too long or invalid')

        return { provider, model }
    }

    // use imagine model
    async useImagineModel(level: number) {
        const options = await this.getConfig<LevelImagineModel>('LEVEL_IMAGINE_MODEL')
        let provider: ImagineModelProvider = ImagineModelProvider.MidJourney
        let model: ImagineModel = ImagineModel.MJ

        /*
        if (level >= options['stable-diffusion-v1-6']) {
            provider = ImagineModelProvider.StabilityAI
            model = ImagineModel.SD_1_6
        }
        if (level >= options['dall-e-2']) {
            provider = ImagineModelProvider.OpenAI
            model = ImagineModel.DALL_E_2
        }
        if (level >= options['dall-e-3']) {
            provider = ImagineModelProvider.OpenAI
            model = ImagineModel.DALL_E_3
        }
        */
        if (level >= options['midjourney']) {
            provider = ImagineModelProvider.MidJourney
            model = ImagineModel.MJ
        }
        return { provider, model }
    }

    // translate input content
    async translate(input: string) {
        const prompt = await this.getConfig('IMAGINE_PROMPT')
        const message: ChatMessage[] = [{ role: ChatRoleEnum.USER, content: `${prompt}\n${input}` }]
        const res = await this.ctx.service.uniAI.chat(message, false, TRANSLATE_PROVIDER, TRANSLATE_MODEL)
        if (res instanceof Readable) throw new Error('Chat response is stream')
        return res.content
    }

    async doChat(input: string, system: string, assistant: string, data: ChatResponse, output: PassThrough) {
        const { ctx } = this

        // check user chat chance
        const user = await ctx.service.user.get(data.userId)
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree + user.chatChance < CHAT_COST) throw new Error('Chat chance not enough')

        // get chat history
        const chats = await ctx.model.Chat.findAll({
            limit: CHAT_PAGE_SIZE,
            order: [['id', 'desc']],
            attributes: ['id', 'role', 'content', 'resourceId', 'resourceName'],
            where: { dialogId: data.dialogId, isDel: false, isEffect: true },
            include: {
                model: ctx.model.Resource,
                attributes: ['id', 'page', 'fileName', 'fileSize', 'filePath', 'fileExt', 'typeId']
            }
        })
        chats.reverse()

        const { USER, SYSTEM, ASSISTANT } = ChatRoleEnum
        const prompts: ChatMessage[] = []

        // system prompt and initial assistant prompt
        system = system || (await this.getConfig('SYSTEM_PROMPT'))
        system += ctx.__('System Time', $.formatDate(new Date(), ctx.request.header['timezone']?.toString()))
        prompts.push({ role: SYSTEM, content: ctx.__('Prompt', system) })
        if (assistant) prompts.push({ role: ASSISTANT, content: assistant })

        // add history chat including resource files
        let embedding: number[] | null = null
        let count = 0
        const exts: string[] = []
        for (const item of chats) {
            const file = item.resource
            if (file) {
                if (file.typeId === ResourceType.IMAGE) {
                    prompts.push({
                        role: USER,
                        content: `# Image File\nFile name: ${item.resourceName}\nFile size: ${file.fileSize} Bytes`,
                        img: ctx.service.util.fileURL(file.filePath, file.fileName, file.fileSize > LIMIT_IMG_SIZE)
                    })
                } else {
                    count++
                    exts.push(file.fileExt)
                    // query resource, one time embedding
                    if (!embedding) embedding = (await ctx.service.uniAI.embedding(input)).embedding[0]
                    const pages = await this.queryPages(file.id, embedding)
                    // make reference resource prompt
                    prompts.push({
                        role: USER,
                        content: `
                        # ${ctx.__('File Reference')} ${count}
                        ## ${ctx.__('File Info')}
                        ${ctx.__('File name:')}${item.resourceName}
                        ${ctx.__('File size:')}${file.fileSize} Bytes
                        ${ctx.__('Total pages:')}${file.page}
                        ## ${ctx.__('File Content')}
                        ${pages.map(v => v.content).join('\n')}
                        ## ${ctx.__('Note')}
                        All the data in CSV format needs to be output in table format.
                    `
                    })
                }
            } else prompts.push({ role: item.role, content: item.content })
        }

        // add user chat
        prompts.push({ role: USER, content: input })
        console.log(prompts)

        // auto select model
        if (!data.model || !data.subModel) {
            const select = await this.useChatModel(prompts, user.level, exts)
            data.model = select.provider
            data.subModel = select.model
        }
        const provider = data.model as ChatModelProvider
        const model = data.subModel as ChatModel

        // start chat stream
        data.content = ctx.__('model inputting')
        output.write(JSON.stringify(data))
        const res = await ctx.service.uniAI.chat(prompts, true, provider, model)
        if (!(res instanceof Readable)) throw new Error('Chat stream is not readable')

        data.content = ''
        res.on('data', (buff: Buffer) => {
            const obj = $.json<ChatResponse>(buff.toString())
            if (obj && obj.content) {
                data.content += obj.content
                data.subModel = obj.model
                output.write(JSON.stringify(data))
            }
        })
        res.on('end', async () => {
            if (!data.content.trim()) return output.destroy(new Error('Unknown error, model output nothing'))

            // save user chat
            await ctx.model.Chat.create({
                dialogId: data.dialogId,
                role: USER,
                content: input,
                model: data.model,
                subModel: data.subModel
            })
            // save assistant chat
            const chat = await ctx.model.Chat.create({
                dialogId: data.dialogId,
                role: ASSISTANT,
                content: data.content,
                model: data.model,
                subModel: data.subModel
            })
            data.chatId = chat.id

            output.end(JSON.stringify(data))

            // reduce user chance, first cost free chance
            const user = await ctx.model.User.findByPk(data.userId, {
                attributes: ['id', 'chatChanceFree', 'chatChance']
            })
            if (user) {
                user.chatChanceFree = Math.max(user.chatChanceFree - CHAT_COST, 0)
                user.chatChance = Math.max(user.chatChance - Math.max(CHAT_COST - user.chatChanceFree, 0), 0)
                await user.save()
            }
        })
        res.on('error', e => output.destroy(e))
    }

    async doImagine(input: string, data: ChatResponse, output: PassThrough) {
        const { ctx } = this

        // check user chat chance
        const user = await ctx.service.user.get(data.userId)
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree + user.chatChance < IMAGINE_COST) throw new Error('Imagine chance not enough')

        // auto set provider and model
        const { provider, model } = await this.useImagineModel(user.level)
        data.model = provider
        data.subModel = model
        data.content = ctx.__('prepare to imagine')
        data.file = { name: '', url: LOAD_IMG, size: 0, ext: 'image/gif' }
        output.write(JSON.stringify(data))

        // imagine
        const res = await ctx.service.uniAI.imagine(await this.translate(input), '', 1, 1024, 1024, provider, model)
        // watch task
        let loop = 0
        while (loop < LOOP_MAX) {
            loop++
            // check task status
            const task = await this.ctx.service.uniAI.task(res.taskId, data.model as ImagineModelProvider)
            if (!task[0]) throw new Error('Task not found')
            if (task[0].fail) throw new Error(task[0].fail)

            const progress = task[0].progress || 0
            data.content = `${ctx.__('imagining')} ${progress}%`
            data.subModel = task[0].model
            const img = task[0].imgs[0]
            if (img) {
                const filePath = await ctx.service.util.putOSS(img)
                const fileName = basename(img)
                const fileExt = extname(img).replace('.', '').toLowerCase()
                const fileSize = statSync(img).size
                const url = ctx.service.util.fileURL(filePath, `${progress}-${basename(img)}`)
                data.file = { url, name: fileName, ext: `image/${fileExt}`, size: fileSize }

                // complete imagining
                if (progress === 100) {
                    // save user chat
                    await ctx.model.Chat.create({
                        dialogId: data.dialogId,
                        role: ChatRoleEnum.USER,
                        content: input,
                        model: data.model,
                        subModel: data.subModel
                    })
                    // save model chat response, image file
                    const chat = await ctx.model.Chat.create(
                        {
                            dialogId: data.dialogId,
                            role: ChatRoleEnum.ASSISTANT,
                            model: data.model,
                            subModel: data.subModel,
                            resourceName: fileName,
                            resource: {
                                fileName,
                                fileExt,
                                filePath,
                                fileSize,
                                typeId: ResourceType.IMAGE,
                                userId: data.userId,
                                tabId: 1
                            }
                        },
                        { include: ctx.model.Resource }
                    )
                    data.chatId = chat.id

                    output.end(JSON.stringify(data))

                    // reduce user chance, first cost free chance
                    const user = await ctx.model.User.findByPk(data.userId, {
                        attributes: ['id', 'chatChanceFree', 'chatChance']
                    })
                    if (user) {
                        user.chatChanceFree = Math.max(user.chatChanceFree - IMAGINE_COST, 0)
                        user.chatChance = Math.max(user.chatChance - Math.max(IMAGINE_COST - user.chatChanceFree, 0), 0)
                        await user.save()
                    }
                    break
                }
            }
            output.write(JSON.stringify(data))
            await $.sleep(LOOP_WAIT)
        }
        if (loop >= LOOP_MAX) throw new Error('Waiting imagine task timeout')
    }

    // upload file
    async upload(file: EggFile, dialogId: number, userId: number) {
        // upload resource to oss
        const { ctx } = this
        const { transaction } = ctx

        // check user chat chance
        const user = await ctx.model.User.findByPk(userId, {
            attributes: ['id', 'chatChanceFree', 'chatChance'],
            transaction
        })
        if (!user) throw new Error('Fail to find user')
        if (user.chatChanceFree + user.chatChance <= CHAT_COST) throw new Error('Chat chance not enough')
        // reduce user chance, first cost free chance
        user.chatChanceFree = Math.max(user.chatChanceFree - CHAT_COST, 0)
        user.chatChance = Math.max(user.chatChance - Math.max(CHAT_COST - user.chatChanceFree, 0), 0)
        await user.save({ transaction })

        // check dialog is right
        const dialog = await ctx.model.Dialog.findOne({
            where: { id: dialogId, userId, isEffect: true, isDel: false },
            attributes: ['id', 'title'],
            transaction
        })
        if (!dialog) throw new Error('Dialog is not available')

        // update title
        if (!dialog.title) await dialog.update({ title: file.filename }, { transaction })

        // upload and embedding resource
        const resource = await ctx.service.uniAI.upload(file, userId)
        if (resource.typeId === ResourceType.TEXT)
            await ctx.service.uniAI.embeddingResource(EmbedModelProvider.Other, resource.id)

        // add chat for resource
        const chat = await ctx.model.Chat.create(
            { dialogId, role: ChatRoleEnum.USER, resourceId: resource.id, resourceName: file.filename },
            { transaction }
        )
        chat.resource = resource
        return chat
    }

    async queryPages(
        resourceId: number,
        embedding: number[],
        limit: number = QUERY_PAGE_LIMIT,
        provider: EmbedModelProvider = EmbedModelProvider.Other
    ) {
        if (provider === EmbedModelProvider.OpenAI)
            return await this.ctx.model.Embedding1.similarFindAll(embedding, limit, { resourceId })
        else if (provider === EmbedModelProvider.Other)
            return await this.ctx.model.Embedding2.similarFindAll(embedding, limit, { resourceId })
        else throw new Error('Embed provider not found')
    }
}
