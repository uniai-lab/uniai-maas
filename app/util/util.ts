/**
 * Common utility functions for the web project.
 *
 * @format prettier
 * @author devilyouwei
 */

import { tmpdir } from 'os'
import { Readable } from 'stream'
import { basename, extname, join } from 'path'
import { createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync } from 'fs'
import axios, { AxiosRequestConfig } from 'axios'
import crypto from 'crypto'
import isJSON from '@stdlib/assert-is-json'
import pdf from '@cyber2024/pdf-parse-fixed'
import libreoffice from 'libreoffice-convert'
import { sentences } from 'sbd'
import { encode, decode } from 'gpt-3-encoder'
import { google } from 'googleapis'
import { convert } from 'html-to-text'
import { similarity } from 'ml-distance'
import { path as ROOT_PATH } from 'app-root-path'
import Mint from 'mint-filter'
import * as pdf2img from 'pdf-to-img'
import * as MINIO from 'minio'
import * as uuid from 'uuid'
import { OSSEnum } from '@interface/Enum'
import isDomain from 'is-valid-domain'
import isBase64 from 'is-base64'

// Environment variables
const {
    GOOGLE_SEARCH_API_TOKEN,
    GOOGLE_SEARCH_ENGINE_ID,
    MINIO_ACCESS_KEY,
    MINIO_END_POINT,
    MINIO_PORT,
    MINIO_SECRET_KEY,
    MINIO_BUCKET
} = process.env

// Minimum split size for text
const MIN_SPLIT_SIZE = 400

// MinIO client
const minio = new MINIO.Client({
    endPoint: MINIO_END_POINT,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
    port: parseInt(MINIO_PORT),
    useSSL: false
})

// Sensitive words filter
const json = JSON.parse(readFileSync(`${ROOT_PATH}/config/sensitive.json`, 'utf-8'))
const mint = new Mint(json)

// Google Custom Search API
const customsearch = google.customsearch('v1')

export default {
    /**
     * Performs an HTTP GET request.
     *
     * @param url - The URL to make the request to.
     * @param params - Optional request parameters.
     * @param config - Optional Axios request configuration.
     * @returns A Promise that resolves with the response data.
     */
    async get<RequestT = any, ResponseT = any>(
        url: string,
        params?: RequestT,
        config?: AxiosRequestConfig
    ): Promise<ResponseT> {
        return (await axios.get(url, { params, ...config })).data
    },

    /**
     * Performs an HTTP POST request.
     *
     * @param url - The URL to make the request to.
     * @param body - The request body.
     * @param config - Optional Axios request configuration.
     * @returns A Promise that resolves with the response data.
     */
    async post<RequestT, ResponseT>(url: string, body?: RequestT, config?: AxiosRequestConfig): Promise<ResponseT> {
        return (await axios.post(url, body, config)).data
    },

    /**
     * Searches online using Google Custom Search.
     *
     * @param prompt - The search query.
     * @param num - The number of search results to return.
     * @returns A Promise that resolves with the search results.
     */
    async search(prompt: string, num: number) {
        return (
            await customsearch.cse.list({
                auth: GOOGLE_SEARCH_API_TOKEN,
                cx: GOOGLE_SEARCH_ENGINE_ID,
                q: prompt,
                num // Number of search results to return
            })
        ).data
    },

    /**
     * Extracts text from a URL.
     *
     * @param url - The URL to extract text from.
     * @returns A Promise that resolves with the extracted text.
     */
    async url2text(url: string) {
        const html = await this.get<undefined, string>(url, undefined, { timeout: 5000 })
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

    contentFilter(content: string, replace: boolean = true) {
        return {
            verify: mint.verify(content),
            ...mint.filter(content, { replace })
        }
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
    async convertPDF(path: string) {
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
        // If not a PDF, first convert to PDF
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
        const file = await pdf(readFileSync(path))
        return { content: this.tinyText(file.text), page: file.numpages }
    },

    /**
     * Reduces multiple consecutive newlines to a single newline.
     *
     * @param text - The text to process.
     * @returns The processed text.
     */
    tinyText(text?: string | null) {
        if (!text) return ''
        else return text.replace(/[\n\r]{2,}/g, '\n').trim()
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
     * @param oss - The OSS type (default is minio).
     * @returns The URL of the uploaded file on oss, e.g., cos/aaa.pdf minio/bbb.pdf oss/ccc.pdf.
     */
    async putOSS(path: string, oss: OSSEnum = OSSEnum.MIN) {
        const name = basename(path)
        if (oss === OSSEnum.MIN) await minio.fPutObject(MINIO_BUCKET, name, path)
        //if (oss === OSSEnum.COS) await cos.uploadFile({ Bucket: COS_BUCKET, Region: COS_REGION, Key: name, FilePath: path })
        else throw new Error('OSS type not found')
        return `${oss}/${name}`
    },

    /**
     * Downloads a file from an Object Storage Service (OSS).
     *
     * @param name - The name of the file to download.
     * @param oss - The type of OSS (COS or MIN) to use. Defaults to COS.
     * @returns A readable stream of the downloaded file.
     * @throws An error if the OSS type is not found.
     */
    async getOSSFile(name: string, oss: OSSEnum = OSSEnum.COS) {
        if (oss === OSSEnum.MIN) return await minio.getObject(MINIO_BUCKET, name)
        // if (oss === OSSEnum.COS) {
        // const res = await cos.getObject({ Bucket: COS_BUCKET, Region: COS_REGION, Key: name })
        // return Readable.from(res.Body)
        // }
        else throw new Error('OSS type not found')
    },

    /**
     * get file from http URL as a readable stream.
     *
     * @param url The URL from which to fetch the file.
     * @returns A Promise that resolves to a Readable stream of the fetched file.
     * @throws Will throw an error if the HTTP request fails or if the URL is invalid.
     */
    async getHttpFile(url: string) {
        return await this.get<undefined, Readable>(url, undefined, { responseType: 'stream' })
    },

    /**
     * Synchronously creates a readable stream from a local file.
     *
     * @param filePath The path to the local file to be read.
     * @returns A Readable stream of the file content.
     * @throws Will throw an error if the file does not exist or cannot be accessed.
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
        const oss = path.split('/')[0] as OSSEnum
        const name = basename(path)

        if (Object.values(OSSEnum).includes(oss)) return await this.getOSSFile(name, oss)
        else if (path.startsWith('http://') || path.startsWith('https://')) return await this.getHttpFile(path)
        else return this.getLocalFile(path)
    },

    /**
     * Retrieves a file from a readable stream and saves it to a local path.
     *
     * @param stream - The readable stream of the file.
     * @param name - The file name to be saved, generate a new uuid filename.
     * @returns A Promise that resolves to the local path of the saved file.
     */
    async getStreamFile(stream: Readable, name: string) {
        const path = join(tmpdir(), `${uuid.v4()}${extname(name)}`)
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
    file2base64(file: string) {
        return readFileSync(file).toString('base64')
    },
    isDomain(text: string) {
        return isDomain(text)
    },
    isTLS(text: string) {
        return text.startsWith('https')
    },
    isBase64(text: string, allowMime: boolean = false) {
        return isBase64(text, { allowMime })
    }
}
