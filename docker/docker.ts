/** @format */

import * as dotenv from 'dotenv'
dotenv.config()
import Docker from 'dockerode'
import * as compose from 'docker-compose'
import { program } from 'commander'
const docker = new Docker()

async function containers() {
    const images = await docker.listContainers()
    console.log(images)
}

async function images() {
    const images = await docker.listContainers()
    console.log(images)
}

async function config(app: string) {
    const cwd = `${__dirname}/${app}`
    const res = await compose.config({ cwd })
    console.log(res.err)
}

async function up(app: string) {
    const cwd = `${__dirname}/${app}`
    const res = await compose.upAll({ cwd })
    console.log(res.err)
}

async function down(app: string) {
    const cwd = `${__dirname}/${app}`
    const res = await compose.down({ cwd })
    console.log(res.err)
}

program.name('OpenAI App Docker CLI').description('CLI to operate docker images').version('0.1.0')
program.command('containers').description('list docker containers').action(containers)
program.command('images').description('list docker images').action(images)
program.command('config').argument('<app>', 'name of docker app').description('show yaml config').action(config)
program.command('up').argument('<app>', 'name of docker app').description('start docker containers').action(up)
program.command('down').argument('<app>', 'name of docker app').description('shut down docker containers').action(down)
program.parse()
