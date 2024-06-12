/**
 * Common utility functions for the UniAI.
 *
 * @format prettier
 * @author devilyouwei
 */

import { tmpdir } from 'os'
import { join } from 'path'
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'fs'
import axios, { AxiosRequestConfig } from 'axios'
import { randomUUID } from 'crypto'
import isJSON from '@stdlib/assert-is-json'
import fixJSON from 'json-fixer'
import { sentences } from 'sbd'
import { encode, decode } from 'gpt-tokenizer'
import { similarity } from 'ml-distance'
import isBase64 from 'is-base64'
import { Logger, ILogObj } from 'tslog'
import moment from 'moment-timezone'

const logger = new Logger<ILogObj>()
// Minimum split size for text
const MIN_SPLIT_SIZE = 400

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
     * Counts the number of tokens in the text using GPT-2.
     *
     * @param text - The text to count tokens in.
     * @returns The number of tokens.
     */
    countTokens(text: string) {
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
     * Parses JSON from a string and returns it as a generic type T.
     *
     * @param str - The JSON string to parse.
     * @returns The parsed JSON as a generic type T.
     */
    json<T>(str: string | null) {
        if (isJSON(str)) return JSON.parse(str) as T
        else return null
    },

    jsonFix<T>(str: string | null) {
        try {
            if (!str) return null
            else return fixJSON(str).data as T
        } catch (e) {
            console.error(e)
            return null
        }
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
     * Synchronously creates a readable stream from a local file.
     *
     * @param filePath The path to the local file to be read.
     * @returns A Readable stream of the file content.
     */
    getLocalFileStream(path: string) {
        if (!existsSync(path)) throw new Error('File not found in local path')
        return createReadStream(path)
    },

    /**
     * Synchronously reads the entire content of a local file into a buffer.
     *
     * @param path - The path to the local file to be read.
     * @returns A Buffer containing the entire file content.
     */
    getLocalFileBuffer(path: string) {
        if (!existsSync(path)) throw new Error('File not found in local path')
        return readFileSync(path)
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

    /**
     * Returns the date of the same time in the next year.
     *
     * @param date - The date from which to calculate the next year's date. Defaults to the current date.
     * @returns A new Date object representing the same time in the next year.
     */
    nextYear(date: Date = new Date()): Date {
        return new Date(
            date.getFullYear() + 1,
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        )
    },

    /**
     * Formats a Date object according to a given template.
     *
     * @param date - The Date object to format. Defaults to the current date.
     * @param zone - The time zone to use for formatting. Defaults to 'America/New_York'.
     * @param format - The format template string according to moment.js's formatting rules. Defaults to 'YYYY-MM-DD HH:mm:ss dddd'.
     * @returns A string representing the formatted date according to the specified format.
     */
    formatDate(
        date: Date = new Date(),
        zone: string = 'America/New_York',
        format: string = 'YYYY-MM-DD HH:mm:ss dddd'
    ) {
        return moment(date).tz(zone).format(format)
    },
    log(data: any) {
        return logger.silly(data)
    },
    error(e: Error) {
        return logger.error(e)
    },

    /**
     * Waits for a given amount of time in milliseconds.
     *
     * @param time - The time in milliseconds to wait.
     * @returns A Promise that resolves after the specified time has passed.
     */
    sleep(time: number) {
        return new Promise(resolve => setTimeout(resolve, time))
    }
}
