/** @format by Prettier
 * This script manages Docker containers.
 * Author: devilyouwei
 * Commands:
 *  - up: Start up Docker containers.
 *  - down: Shut down Docker containers.
 *  - containers: List Docker containers.
 *  - images: List Docker images.
 *  - config: Show Docker configuration.
 */

import 'dotenv/config'
import Docker from 'dockerode'
import * as compose from 'docker-compose'
import { program } from 'commander'
const docker = new Docker()

/** List all running Docker containers */
async function containers() {
    try {
        const containers = await docker.listContainers()
        console.log(containers)
    } catch (e) {
        console.error('Error listing containers:', e)
    }
}

/** List all Docker images */
async function images() {
    try {
        const images = await docker.listImages()
        console.log(images)
    } catch (e) {
        console.error('Error listing images:', e)
    }
}

/** Display Docker configuration for a specified app */
async function config(app: string) {
    try {
        const cwd = `${__dirname}/${app}`
        const res = await compose.config({ cwd })
        console.log(res.err ? res.err : 'Configuration loaded successfully.')
    } catch (e) {
        console.error('Error loading configuration:', e)
    }
}

/** Start up Docker containers for a specified app */
async function up(app: string) {
    try {
        const cwd = `${__dirname}/${app}`
        console.log('Starting Docker containers...')
        const res = await compose.upAll({ cwd, log: true })
        console.log(res.err)
    } catch (e) {
        console.error('Error starting containers:', e)
    }
}

/** Shut down Docker containers for a specified app */
async function down(app: string) {
    try {
        const cwd = `${__dirname}/${app}`
        console.log('Shutting down Docker containers...')
        const res = await compose.down({ cwd, log: true })
        console.log(res.err)
    } catch (e) {
        console.error('Error shutting down containers:', e)
    }
}

program.name('UniAI App Docker CLI').description('CLI to operate docker images').version('1.0.0')
program.command('containers').description('List Docker containers').action(containers)
program.command('images').description('List Docker images').action(images)
program.command('config').argument('<app>', 'Name of Docker app').description('Show YAML configuration').action(config)
program.command('up').argument('<app>', 'Name of Docker app').description('Start Docker containers').action(up)
program.command('down').argument('<app>', 'Name of Docker app').description('Shut down Docker containers').action(down)
program.parse()
