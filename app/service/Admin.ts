/** @format */

import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Service } from 'egg'
import md5 from 'md5'

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Admin extends Service {
    /*
    async signUp(username: string, password: string) {
        const { ctx } = this
        const user = await ctx.model.User.create({
            name: username
        })
        user.password = md5(`${password}${user.id}`)
        return await user.save()
    }
    */
    // add a new user
    async updateUser(data: AdminUpdateUserPost) {
        const { ctx } = this

        const defaults = {
            name: data.username,
            phone: data.phone,
            email: data.email,
            avatar: data.avatar,
            countryCode: data.countryCode,
            chance: {
                chatChance: data.chatChance,
                uploadChance: data.uploadChance,
                level: data.level
            }
        }
        const [user, flag] = await ctx.model.User.findOrCreate({
            where: {
                username: data.username
            },
            include: {
                model: ctx.model.UserChance
            },
            defaults
        })
        user.password = md5(`${data.password}${user.id}`)
        if (!flag) {
            user.name = data.username || user.name
            user.phone = data.phone || user.phone
            user.countryCode = data.countryCode || user.countryCode
            user.email = data.phone || user.phone
            user.avatar = data.avatar || user.avatar
            user.chance.chatChance = data.chatChance || user.chance.chatChance
            user.chance.uploadChance = data.uploadChance || user.chance.uploadChance
            user.chance.level = data.level || user.chance.level
            await user.save()
            await user.chance.save()
        }

        return { user: await user.save(), flag }
    }
}
