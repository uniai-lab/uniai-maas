/**
 * Common utility functions for the UniAI.
 *
 * @format prettier
 * @author devilyouwei
 */

import { tmpdir } from 'os'
import { Readable } from 'stream'
import { basename, extname, join } from 'path'
import { createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync } from 'fs'
import axios, { AxiosRequestConfig } from 'axios'
import crypto, { randomUUID } from 'crypto'
import isJSON from '@stdlib/assert-is-json'
import pdf from '@cyber2024/pdf-parse-fixed'
import libreoffice from 'libreoffice-convert'
import { sentences } from 'sbd'
import { encode, decode } from 'gpt-3-encoder'
import { convert } from 'html-to-text'
import { similarity } from 'ml-distance'
import { path as ROOT_PATH } from 'app-root-path'
import Mint from 'mint-filter'
import * as pdf2img from 'pdf-to-img'
import * as MINIO from 'minio'
import QRCode from 'qrcode'
import isDomain from 'is-valid-domain'
import isBase64 from 'is-base64'
import { Logger, ILogObj } from 'tslog'

// Environment variables
const { MINIO_ACCESS_KEY, MINIO_END_POINT, MINIO_PORT, MINIO_SECRET_KEY, MINIO_BUCKET } = process.env

// Minimum split size for text
const MIN_SPLIT_SIZE = 400

// Sensitive words dictionary for mint filter
const mint = new Mint(JSON.parse(readFileSync(`${ROOT_PATH}/app/data/sensitive.json`, 'utf-8')))

// MinIO client
const oss = new MINIO.Client({
    endPoint: MINIO_END_POINT,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
    port: parseInt(MINIO_PORT),
    useSSL: false
})
const logger = new Logger<ILogObj>()

export default {
    /**
     * Performs an HTTP GET request.
     *
     * @param url - The URL to make the request to.
     * @param params - Optional request parameters.
     * @param config - Optional Axios request configuration.
     * @returns A Promise that resolves with the response data.
     */
    async get<RequestT, ResponseT>(url: string, params?: RequestT, config?: AxiosRequestConfig) {
        return (await axios.get<ResponseT>(url, { params, ...config })).data
    },

    /**
     * Performs an HTTP POST request.
     *
     * @param url - The URL to make the request to.
     * @param body - The request body.
     * @param config - Optional Axios request configuration.
     * @returns A Promise that resolves with the response data.
     */
    async post<RequestT, ResponseT>(url: string, body?: RequestT, config?: AxiosRequestConfig) {
        return (await axios.post<ResponseT>(url, body, config)).data
    },

    /**
     * Extracts text from a URL.
     *
     * @param url - The URL to extract text from.
     * @returns A Promise that resolves with the extracted text.
     */
    async url2text(url: string) {
        const html: string = await this.get(url, null, { timeout: 5000 })
        return this.html2text(html)
    },

    /**
     * Extracts text from HTML content.
     *
     * @param html - The HTML content to extract text from.
     * @returns The extracted text.
     */
    html2text(html: string) {
        return convert(html, {
            selectors: [
                { selector: 'a', format: 'inline' },
                { selector: 'button', format: 'skip' },
                { selector: 'img', format: 'skip' }
            ]
        })
    },

    /**
     * Filters the content based on sensitive words.
     *
     * @param content - The content to filter.
     * @param replace - Optional flag to indicate whether to replace sensitive words with placeholders. Defaults to `true`.
     * @returns An object containing the verification result and filtered content.
     */
    contentFilter(content: string, replace: boolean = true) {
        // Sensitive words filter
        return { verify: mint.verify(content), ...mint.filter(content, { replace }) }
    },

    /**
     * Decrypts data with crypto.
     *
     * @param data - The encrypted data to decrypt.
     * @param algorithm - Choose the crypto algorithm.
     * @param key - The key.
     * @param iv - The initialization vector.
     * @returns The decrypted data.
     */
    decode(data: Buffer, algorithm: string, key: Buffer, iv: Buffer | null) {
        const decipher = crypto.createDecipheriv(algorithm, key, iv)
        decipher.setAutoPadding(true)
        let decoded: string
        decoded = decipher.update(data, undefined, 'utf8')
        decoded += decipher.final('utf8')
        return decoded
    },

    /**
     * Counts the number of tokens in the text using GPT-2.
     *
     * @param text - The text to count tokens in.
     * @returns The number of tokens.
     */
    countTokens(text: string): number {
        return encode(text).length
    },

    /**
     * Slices the text into a specified number of tokens starting from a given index.
     *
     * @param text - The text to slice.
     * @param slice - The number of tokens to slice.
     * @param from - The starting index for slicing (default is 0).
     * @returns The sliced text.
     */
    subTokens(text: string, slice: number, from: number = 0) {
        const tokens = encode(text)
        const nTokens: number[] = []
        for (let i = from; i < tokens.length; i++) {
            if (nTokens.length >= slice) break
            nTokens.push(tokens[i])
        }
        return decode(nTokens)
    },

    /**
     * Converts office files to PDF format.
     *
     * @param path - The path to the office file.
     * @returns A Promise that resolves with the path to the converted PDF file.
     */
    convertPDF(path: string) {
        return new Promise<string>((resolve, reject) => {
            libreoffice.convert(readFileSync(path), '.pdf', undefined, (err, data) => {
                if (err) reject(err)
                else {
                    path = path.replace(extname(path), '.pdf')
                    writeFileSync(path, data)
                    resolve(path)
                }
            })
        })
    },

    /**
     * Converts a PDF file to images.
     *
     * @param path - The path to the PDF file.
     * @returns A Promise that resolves with an array of image paths.
     */
    async convertIMG(path: string) {
        // If not a PDF, convert to PDF
        if (extname(path) !== '.pdf') path = await this.convertPDF(path)

        const imgs: string[] = []
        const pages = await pdf2img.pdf(path, { scale: 2 })
        let i = 0
        for await (const item of pages) {
            i++
            const img = `${path.replace(extname(path), '')}-page${i}.png`
            writeFileSync(img, item)
            imgs.push(img)
        }
        return imgs
    },

    /**
     * Extracts content from a PDF file.
     *
     * @param path - The path to the PDF file.
     * @returns An object containing the extracted content and the number of pages.
     */
    async convertText(path: string) {
        if (extname(path) !== '.pdf') path = await this.convertPDF(path)
        const { text, numpages } = await pdf(readFileSync(path))
        return { content: this.tinyText(text), page: numpages }
    },

    /**
     * Reduces multiple consecutive newlines to a single newline.
     *
     * @param text - The text to process.
     * @returns The processed text.
     */
    tinyText(text: string) {
        return text.replace(/[\n\r]{2,}/g, '\n').trim()
    },

    /**
     * Splits a long document text into pages by sentences.
     *
     * @param text - The text to split.
     * @param min - The minimum number of tokens per page.
     * @returns An array of pages.
     */
    splitPage(text: string, min: number = MIN_SPLIT_SIZE) {
        const paragraph = this.tinyText(text)
            .split(/[。？！]/g)
            .filter(s => s.trim().length > 0)
        let chunks: string[] = []
        for (const item of paragraph) chunks = chunks.concat(sentences(item))
        const arr: string[] = []
        let tmp: string = ''
        for (const item of chunks) {
            tmp += `${item} `
            if (this.countTokens(tmp) >= min) {
                arr.push(tmp.trim())
                tmp = ''
            }
        }
        if (tmp.length) arr.push(tmp.trim())
        return arr
    },

    /**
     * Checks if a given string is a valid phone number.
     *
     * @param num - The phone number to check.
     * @returns True if the phone number is valid; otherwise, false.
     */
    checkPhone(num: string) {
        const reg = /^1[3456789]{1}\d{9}$/
        return reg.test(num)
    },

    /**
     * Uploads a file to Object Storage Service (OSS)
     *
     * @param path - The path to the file to upload.
     * @returns The URL of the uploaded file on oss, e.g., cos/aaa.pdf minio/bbb.pdf oss/ccc.pdf.
     */
    async putOSS(path: string) {
        const name = basename(path)
        await oss.fPutObject(MINIO_BUCKET, name, path)
        return `minio/${name}`
    },

    /**
     * Downloads a file from an Object Storage Service (OSS).
     *
     * @param name - The name of the file to download.
     * @param oss - The type of OSS (COS or MIN) to use. Defaults to COS.
     * @returns A readable stream of the downloaded file.
     */
    async getOSSFile(name: string) {
        return await oss.getObject(MINIO_BUCKET, name)
    },

    /**
     * get file from http URL as a readable stream.
     *
     * @param url The URL from which to fetch the file.
     * @returns A Promise that resolves to a Readable stream of the fetched file.
     */
    async getHttpFile(url: string, query?: object) {
        return await this.get<object, Readable>(url, query, { responseType: 'stream' })
    },

    /**
     * Synchronously creates a readable stream from a local file.
     *
     * @param filePath The path to the local file to be read.
     * @returns A Readable stream of the file content.
     */
    getLocalFile(path: string) {
        if (existsSync(path)) return createReadStream(path)
        else throw new Error('File path not found')
    },

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
    },

    /**
     * Directly get file from a URL, local, oss path
     *
     * @param path - OSS, http url, local filepath
     * @returns - local tmp file path
     */
    async getFile(path: string) {
        return await this.getStreamFile(await this.getFileStream(path), extname(path))
    },

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
    },

    /**
     * Parses JSON from a string and returns it as a generic type T.
     *
     * @param str - The JSON string to parse.
     * @returns The parsed JSON as a generic type T.
     */
    json<T>(str: string | null) {
        if (isJSON(str)) return JSON.parse(str) as T
        else return null
    },

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
    },

    /**
     * Computes the greatest common divisor (GCD) of two numbers using Euclidean algorithm.
     *
     * @param a - The first number.
     * @param b - The second number.
     * @returns The GCD of the two numbers.
     */
    getGCD(a: number, b: number) {
        if (b === 0) return a
        return this.getGCD(b, a % b)
    },

    /**
     * Calculates and returns the aspect ratio of a width and height.
     *
     * @param width - The width dimension.
     * @param height - The height dimension.
     * @returns The aspect ratio in the format "width:height".
     */
    getAspect(width: number, height: number) {
        if (!width || !height) return '1:1'

        const gcd = this.getGCD(width, height)
        const aspectRatioWidth = width / gcd
        const aspectRatioHeight = height / gcd

        return `${aspectRatioWidth}:${aspectRatioHeight}`
    },

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
    },

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
    },

    /**
     * Checks if a string is a valid domain name.
     *
     * @param text - The string to check.
     * @returns `true` if the string is a valid domain name, otherwise `false`.
     */
    isDomain(text: string) {
        return isDomain(text)
    },

    /**
     * Checks if a string represents a TLS/HTTPS URL.
     *
     * @param text - The string to check.
     * @returns `true` if the string starts with "https", otherwise `false`.
     */
    isTLS(text: string) {
        return text.startsWith('https')
    },

    /**
     * Checks if a string is a valid base64 encoded value.
     *
     * @param text - The string to check.
     * @param allowMime - Optional flag to allow MIME types as part of the base64 string. Defaults to `false`.
     * @returns `true` if the string is a valid base64 encoded value, otherwise `false`.
     */
    isBase64(text: string, allowMime: boolean = false): boolean {
        return isBase64(text, { allowMime })
    },

    /**
     * Generates a QR code as a data URL from the provided text.
     *
     * @param text - The text to encode in the QR code.
     * @returns A promise that resolves to the data URL of the QR code.
     */
    async getQRCode(text: string): Promise<string> {
        return await QRCode.toDataURL(text)
    },

    /**
     * Returns the date of the same time in the next month.
     *
     * @param date - The date from which to calculate the next month's date. Defaults to the current date.
     * @returns A new Date object representing the same time in the next month.
     */
    nextMonthSameTime(date: Date = new Date()): Date {
        const year = date.getFullYear()
        const month = date.getMonth()

        return new Date(
            month === 11 ? year + 1 : year,
            month === 11 ? 0 : month + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        )
    },
    log(data: any) {
        return logger.silly(data)
    },
    error(e: Error) {
        return logger.error(e)
    },
    sleep(time: number) {
        return new Promise(resolve => setTimeout(resolve, time))
    }
}
