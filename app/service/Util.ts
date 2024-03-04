/**
 * Common utility function lib.
 *
 * @format prettier
 * @author devilyouwei
 */

import { Service } from 'egg'
import { AccessLevel, SingletonProto } from '@eggjs/tegg'
import { Readable } from 'stream'
import { basename, extname, join } from 'path'
import { createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import isJSON from '@stdlib/assert-is-json'
import libreoffice from 'libreoffice-convert'
import { similarity } from 'ml-distance'
import { path as ROOT_PATH } from 'app-root-path'
import { tmpdir } from 'os'
import { isIP } from 'net'
import xlsx from 'xlsx'
import pdf from '@cyber2024/pdf-parse-fixed'
import Mint from 'mint-filter'
import * as pdf2img from 'pdf-to-img'
import QRCode from 'qrcode'
import isBase64 from 'is-base64'
import util from 'util'
import { decode } from 'iconv-lite'
import pdf2md from 'pdf2md-ts'

import $ from '@util/util'

const convertSync = util.promisify(libreoffice.convert)

const { MINIO_BUCKET } = process.env

// Sensitive words dictionary for mint filter
const mint = new Mint(JSON.parse(readFileSync(`${ROOT_PATH}/app/data/sensitive.json`, 'utf-8')))

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export default class Util extends Service {
    /**
     * Filters the content based on sensitive words.
     *
     * @param content - The content to filter.
     * @param replace - Optional flag to indicate whether to replace sensitive words with placeholders. Defaults to `true`.
     * @returns An object containing the verification result and filtered content.
     */
    mintFilter(content: string, replace: boolean = true) {
        // Sensitive words filter
        return { verify: mint.verify(content), ...mint.filter(content, { replace }) }
    }

    /**
     * Converts a PDF file to images.
     *
     * @param path - The path to the office file.
     * @returns A Promise that resolves with an array of converted image paths.
     */
    async convertIMG(path: string) {
        // If not a PDF, convert to PDF
        const buffer =
            extname(path) === '.pdf' ? readFileSync(path) : await convertSync(readFileSync(path), 'pdf', undefined)

        const imgs: string[] = []
        const pages = await pdf2img.pdf(buffer, { scale: 2 })
        let i = 0
        for await (const item of pages) {
            i++
            const img = `${path.replace(extname(path), '')}-page${i}.png`
            writeFileSync(img, item)
            imgs.push(img)
        }
        return imgs
    }

    /**
     * Extracts content from an office file.
     *
     * @param path - The path to the office file.
     * @returns An object containing the extracted content and the number of pages.
     */
    async extractText(path: string) {
        const ext = extname(path)
        if (ext === '.xls' || ext === '.xlsx') {
            const res = xlsx.readFile(path)
            let content: string = ''
            let page: number = 0
            for (const i in res.Sheets) {
                const txt = xlsx.utils.sheet_to_txt(res.Sheets[i], { FS: '\t' })
                content += decode(Buffer.from(txt, 'binary'), 'utf-16')
                page++
            }
            return { content, page }
        } else {
            const buffer = ext === '.pdf' ? readFileSync(path) : await convertSync(readFileSync(path), 'pdf', undefined)
            const { text, numpages } = await pdf(buffer)
            return { content: text, page: numpages }
        }
    }

    // extract pages from office file
    async extractPages(path: string) {
        const ext = extname(path)
        if (ext === '.xls' || ext === '.xlsx') {
            const res = xlsx.readFile(path)
            const pages: string[] = []
            for (const i in res.Sheets)
                pages.push(`**Sheet Name: ${i}**<hr>${xlsx.utils.sheet_to_csv(res.Sheets[i])}<hr>`)
            return pages
        } else {
            const buffer =
                extname(path) === '.pdf' ? readFileSync(path) : await convertSync(readFileSync(path), 'pdf', undefined)
            const pages = await pdf2md(buffer)
            return pages.map((v, i) => `**Page Number: ${i + 1}**<hr>${v}<hr>`)
        }
    }

    /**
     * Uploads a file to Object Storage Service (OSS)
     *
     * @param path - The path to the file to upload.
     * @returns The URL of the uploaded file on oss, e.g., cos/aaa.pdf minio/bbb.pdf oss/ccc.pdf.
     */
    async putOSS(path: string) {
        const name = basename(path)
        await this.app.minio.fPutObject(MINIO_BUCKET, name, path)
        return `minio/${name}`
    }

    /**
     * Downloads a file from an Object Storage Service (OSS).
     *
     * @param name - The name of the file to download.
     * @param oss - The type of OSS (COS or MIN) to use. Defaults to COS.
     * @returns A readable stream of the downloaded file.
     */
    async getOSSFile(name: string) {
        return await this.app.minio.getObject(MINIO_BUCKET, name)
    }

    /**
     * get file from http URL as a readable stream.
     *
     * @param url The URL from which to fetch the file.
     * @returns A Promise that resolves to a Readable stream of the fetched file.
     */
    async getHttpFile(url: string, query?: object) {
        return await $.get<object, Readable>(url, query, { responseType: 'stream' })
    }

    /**
     * Synchronously creates a readable stream from a local file.
     *
     * @param filePath The path to the local file to be read.
     * @returns A Readable stream of the file content.
     */
    getLocalFile(path: string) {
        if (!existsSync(path)) throw new Error('File not found in local path')
        return createReadStream(path)
    }

    /**
     * Gets a readable stream for a file located at the specified path.
     *
     * @param path - The path, url, oss to the file.
     * @returns A readable stream of the file.
     */
    async getFileStream(path: string) {
        if (path.startsWith('minio')) return await this.getOSSFile(path.split('/')[1])
        else if (path.startsWith('http://') || path.startsWith('https://')) return await this.getHttpFile(path)
        else return this.getLocalFile(path)
    }

    /**
     * Directly get file from a URL, local, oss path
     *
     * @param path - OSS, http url, local filepath
     * @returns - local tmp file path
     */
    async getFile(path: string) {
        return await this.getStreamFile(await this.getFileStream(path), extname(path))
    }

    /**
     * Retrieves a file from a readable stream and saves it to a local path.
     *
     * @param stream - The readable stream of the file.
     * @param name - The file name to be saved, generate a new uuid filename.
     * @returns A Promise that resolves to the local path of the saved file.
     */
    async getStreamFile(stream: Readable, ext: string) {
        const path = join(tmpdir(), randomUUID() + ext)
        return new Promise<string>((resolve, reject) =>
            stream
                .pipe(createWriteStream(path))
                .on('error', reject)
                .on('finish', () => resolve(path))
        )
    }

    // generate file url
    url(path: string, name?: string) {
        const { hostname, host } = this.ctx.request.URL
        return `${isIP(hostname) || hostname === 'localhost' ? 'http://' : 'https://'}${host}/wechat/file?path=${path}${name ? `&name=${encodeURIComponent(name)}` : ''}`
    }

    /**
     * Parses JSON from a string and returns it as a generic type T.
     *
     * @param str - The JSON string to parse.
     * @returns The parsed JSON as a generic type T.
     */
    json<T>(str: string | null) {
        if (isJSON(str)) return JSON.parse(str) as T
        else return null
    }

    /**
     * Calculates the cosine similarity between two numeric arrays.
     *
     * @param v1 - The first numeric array.
     * @param v2 - The second numeric array.
     * @returns The cosine similarity value between the two arrays.
     */
    cosine(v1: number[], v2: number[]) {
        if (v1.length !== v2.length) return 0
        else return similarity.cosine(v1, v2)
    }

    /**
     * Converts a file to base64 encoding.
     *
     * @param file - The path to the file.
     * @returns The base64 encoded string.
     */
    file2base64(file: string, mime: boolean = false) {
        const base64 = readFileSync(file).toString('base64')
        if (mime) return 'data:image/png;base64,' + base64
        else return base64
    }

    /**
     * Decodes a base64 encoded string and saves it as a file.
     *
     * @param base64str - A string encoded in base64 format.
     * @param ext - (Optional) The extension of the file to be saved. If not provided, the file is saved without an extension.
     * @returns A string representing the file path where the decoded content is saved. By default, the file is saved in the system's temporary directory.
     */
    base64toFile(base64str: string, ext?: string): string {
        const buffer = Buffer.from(base64str, 'base64')
        const output = join(tmpdir(), `${randomUUID()}${ext ? '.' + ext : ''}`)
        writeFileSync(output, buffer)
        return output
    }

    /**
     * Checks if a string is a valid base64 encoded value.
     *
     * @param text - The string to check.
     * @param allowMime - Optional flag to allow MIME types as part of the base64 string. Defaults to `false`.
     * @returns `true` if the string is a valid base64 encoded value, otherwise `false`.
     */
    isBase64(text: string, allowMime: boolean = false): boolean {
        return isBase64(text, { allowMime })
    }

    /**
     * Generates a QR code as a data URL from the provided text.
     *
     * @param text - The text to encode in the QR code.
     * @returns A promise that resolves to the data URL of the QR code.
     */
    async getQRCode(text: string): Promise<string> {
        return await QRCode.toDataURL(text)
    }
}
