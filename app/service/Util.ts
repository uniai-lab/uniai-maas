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
import { createWriteStream, readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import libreoffice from 'libreoffice-convert'
import { path as ROOT_PATH } from 'app-root-path'
import { tmpdir } from 'os'
import { isIP } from 'net'
import xlsx from 'xlsx'
import pdf from '@cyber2024/pdf-parse-fixed'
import Mint from 'mint-filter'
import * as pdf2img from 'pdf-to-img'
import QRCode from 'qrcode'
import util from 'util'
import { decode } from 'iconv-lite'
import pdf2md from 'pdf2md-ts'
import { parseOfficeAsync } from 'officeparser'
import sharp from 'sharp'
import $ from '@util/util'

const convertSync = util.promisify(libreoffice.convert)

const { MINIO_BUCKET } = process.env

// Sensitive words dictionary for mint filter
const mint = new Mint(JSON.parse(readFileSync(`${ROOT_PATH}/app/data/sensitive.json`, 'utf-8')))

const ZIP_IMG_QUALITY = 80
const ZIP_IMG_WIDTH = 800

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
            extname(path).toLowerCase() === '.pdf'
                ? readFileSync(path)
                : await convertSync(readFileSync(path), 'pdf', undefined)

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
     * Extract content from an office file.
     *
     * @param path - The path to the office file.
     * @returns Extracted content from the file.
     */
    async extractText(path: string) {
        const ext = extname(path).replace('.', '').toLowerCase()
        let content = ''
        if (['xls', 'xlsx', 'et'].includes(ext)) {
            const res = xlsx.readFile(path)
            content = Object.keys(res.Sheets)
                .map(i => decode(Buffer.from(xlsx.utils.sheet_to_txt(res.Sheets[i]), 'binary'), 'utf-16'))
                .join('\n')
        } else if (['docx', 'pptx', 'odt', 'odp', 'ods'].includes(ext)) return await parseOfficeAsync(path)
        else if (['doc', 'ppt', 'pdf'].includes(ext)) {
            const buffer = readFileSync(path)
            const { text } = await pdf(ext === 'pdf' ? buffer : await convertSync(buffer, 'pdf', undefined))
            content = text
        } else content = readFileSync(path).toString('utf-8')

        if (!content.trim()) throw new Error('Fail to extract content text')
        return content
    }

    /**
     * Extract page content from office file
     * @param path - The file path of the office file.
     * @returns An array of strings representing the extracted pages in markdown
     */
    async extractPages(path: string) {
        const ext = extname(path).replace('.', '').toLowerCase()

        if (['xls', 'xlsx', 'et'].includes(ext)) {
            const res = xlsx.readFile(path)
            const arr = Object.keys(res.Sheets).map(
                i => `**Sheet Name: ${i}**<hr>${xlsx.utils.sheet_to_csv(res.Sheets[i])}<hr>`
            )
            return arr
        } else {
            const buffer =
                extname(path).toLowerCase() === '.pdf'
                    ? readFileSync(path)
                    : await convertSync(readFileSync(path), 'pdf', undefined)
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
    async putOSS(path: string, name?: string) {
        name = name || basename(path)
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
     * Gets a readable stream for a file located at the specified path.
     *
     * @param path - The path, url, oss to the file.
     * @returns A readable stream of the file.
     */
    async getFileStream(path: string) {
        if (path.startsWith('minio')) return await this.getOSSFile(path.split('/')[1])
        else if (path.startsWith('http')) return await this.getHttpFile(path)
        else throw new Error('Invalid file path: use http or minio URL')
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

    /**
     * Dynamically generate file URL
     * @param path - The path of the file
     * @param name - Optional name of the file
     * @returns The dynamically generated file URL
     */
    fileURL(path: string, name?: string, zip: boolean = false): string {
        const { hostname, host } = this.ctx.request.URL
        const http = isIP(hostname) || hostname === 'localhost' ? 'http' : 'https'
        let url = `${http}://${host}/wechat/file`
        url += `?path=${path}`
        if (name) url += `&name=${encodeURIComponent(name)}`
        if (zip) url += `&zip=1`
        return url
    }

    /**
     * Dynamically generate pay callback URL
     * @returns The dynamically generated pay callback URL
     */
    paybackURL(): string {
        const { host } = this.ctx.request.URL
        return `https://${host}/pay/callback`
    }

    /**
     * Generates a QR code as a data URL from the provided text.
     *
     * @param text - The text to encode in the QR code.
     * @returns A promise that resolves to the data URL of the QR code.
     */
    async getQRCode(text: string) {
        return await QRCode.toDataURL(text)
    }

    /**
     * Asynchronously compress an image.
     * @param path The path of the image.
     * @param width The width of the image.
     * @param quality The compression quality.
     * @returns Promise<string> The path of the compressed webp image.
     */
    async compressImage(path: string, width: number = ZIP_IMG_WIDTH, quality: number = ZIP_IMG_QUALITY) {
        const nPath = path.replace(extname(path), '-zip.webp')
        await sharp(path)
            .resize({ width, withoutEnlargement: true, fit: 'contain' })
            .webp({ quality })
            .rotate()
            .toFile(nPath)
        return nPath
    }

    /**
     * Compress a streaming image.
     * @param stream The readable stream.
     * @param width The width of the image.
     * @param quality The compression quality.
     * @returns Readable The compressed webp image readable stream.
     */
    compressStreamImage(stream: Readable, width: number = ZIP_IMG_WIDTH, quality: number = ZIP_IMG_QUALITY) {
        return stream.pipe(
            sharp().resize({ width, withoutEnlargement: true, fit: 'contain' }).webp({ quality }).rotate()
        ) as Readable
    }
}
