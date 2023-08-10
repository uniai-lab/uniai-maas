/** @format */

import md5 from 'md5'
import { random } from 'lodash'
import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class User extends Service {
    // get app configs to user
    async getConfig() {
        const res = await this.ctx.model.Config.findAll({
            where: { isDel: false, isEffect: true },
            attributes: ['key', 'value', 'isJson']
        })
        const data: ConfigResponseData = {}
        for (const item of res) data[item.key] = item.isJson ? JSON.parse(item.value) : item.value
        return data
    }

    // get user info
    async getUser(id: number) {
        const { ctx } = this
        return await ctx.model.User.findOne({
            where: {
                id,
                isDel: false,
                isEffect: true
            },
            include: [{ model: ctx.model.UserChance }]
        })
    }

    // common sign in
    async signIn(username: string, password: string) {
        const { ctx } = this
        // check user
        const user = await ctx.model.User.findOne({ where: { username: username, isEffect: true, isDel: false } })
        if (!user || user.password !== md5(`${password}${user.id}`)) throw new Error('Invalid username or password')

        // update login token
        user.token = md5(`${new Date()}${user.phone}${random(1000, 9999)}${password}`)
        user.tokenTime = new Date()
        await user.save()

        return user
    }

    // common sign up with phone
    async signUp(username: string, password: string, phone: string) {
        const { ctx } = this
        // create user by username
        const user = await ctx.model.User.create({ name: username })
        user.password = md5(`${password}${user.id}`)
        user.phone = phone
        return await user.save()
    }
}
