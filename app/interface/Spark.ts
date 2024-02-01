/** @format */

export interface FlyAuditParams {
    accessKeyId: string
    accessKeySecret: string
    appId: string
    utc: string
    uuid: string
    modeType?: 'base64' | 'link'
}

export interface FlyAuditRequest {
    content: string
    is_match_all?: number
    categories?: string[]
    lib_ids?: string[]
    biz_type?: string
}

export interface FlyAuditResponse {
    code: string
    desc: string
    data: {
        result: {
            suggest: 'pass' | 'block'
            detail: object
        }
        request_id: string
    }
    sid: string
}
