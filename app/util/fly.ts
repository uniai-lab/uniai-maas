/**
 * IFLYTEK API utility for chat.
 *
 * @format
 * @date 2023-9-8
 * @author devilyouwei
 */

import moment from 'moment'
import { createHmac, randomUUID } from 'crypto'
import { FlyAuditParams, FlyAuditRequest, FlyAuditResponse } from '@interface/Spark'
import { FLYAuditType } from '@interface/Enum'
import $ from '@util/util'

const { FLY_API_KEY, FLY_APP_ID, FLY_API_SECRET } = process.env

const AUDIT_API = 'https://audit.iflyaisol.com'

export default {
    // use iFlyTek Audit API to audit text and image
    // input content for image is file base64
    async audit(content: string) {
        const type: FLYAuditType = $.isBase64(content) ? FLYAuditType.IMAGE : FLYAuditType.TEXT
        const url = getAuditURL(type)
        return await $.post<FlyAuditRequest, FlyAuditResponse>(url, {
            content,
            is_match_all: 0,
            categories: ['pornDetection', 'violentTerrorism', 'political', 'contraband']
        })
    }
}

/**
 * Generates the URL for the iFlyTek audit request.
 *
 * @param type - The type of content to be audit, e.g., IMAGE, TEXT, AUDIO, VIDEO
 * @returns The URL for the audit request.
 */
function getAuditURL(type: FLYAuditType) {
    // 生成 UTC 时间和 UUID
    const utc = moment().utc(true).format('YYYY-MM-DD[T]HH:mm:ss[+0000]')
    const uuid = randomUUID()

    // 1. 生成 Base String
    const params: FlyAuditParams = {
        accessKeyId: FLY_API_KEY,
        accessKeySecret: FLY_API_SECRET,
        appId: FLY_APP_ID,
        utc: encodeURIComponent(utc),
        uuid: encodeURIComponent(uuid)
    }
    if (type === FLYAuditType.IMAGE) params.modeType = 'base64'

    const baseString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&')

    // 2. 生成 Signature
    const signature = createHmac('sha1', FLY_API_SECRET).update(baseString).digest('base64')

    // 3. 构造最终的 URL
    return `${AUDIT_API}/audit/v2/${type}?${baseString}&signature=${encodeURIComponent(signature)}`
}
