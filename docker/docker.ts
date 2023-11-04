/** @format
 * Use this scripts to manage docker containers
 * up - start up docker
 * down - stop docker
 */

import 'dotenv/config'
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
    try {
        const cwd = `${__dirname}/${app}`
        const res = await compose.config({ cwd })
        console.log(res.err)
    } catch (e) {
        console.error(e)
    }
}

async function up(app: string) {
    try {
        const cwd = `${__dirname}/${app}`
        const res = await compose.upAll({ cwd })
        console.log(res.err)
    } catch (e) {
        console.error(e)
    }
}

async function down(app: string) {
    try {
        const cwd = `${__dirname}/${app}`
        const res = await compose.down({ cwd })
        console.log(res.err)
    } catch (e) {
        console.error(e)
    }
}

program.name('OpenAI App Docker CLI').description('CLI to operate docker images').version('0.1.0')
program.command('containers').description('list docker containers').action(containers)
program.command('images').description('list docker images').action(images)
program.command('config').argument('<app>', 'name of docker app').description('show yaml config').action(config)
program.command('up').argument('<app>', 'name of docker app').description('start docker containers').action(up)
program.command('down').argument('<app>', 'name of docker app').description('shut down docker containers').action(down)
program.parse()
