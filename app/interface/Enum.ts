/** @format */

export enum PayType {
    Alipay = 'alipay',
    WeChat = 'wechat'
}

export enum AuditProvider {
    MINT = 'mint-filter', // a local json dict filter
    WX = 'wechat', // WeChat message check
    FLY = 'iflytek', // 科大讯飞NLP合规性接口
    AI = 'chatglm' // use LLM AI model
}

export enum FLYAuditType {
    TEXT = 'syncText',
    IMAGE = 'image',
    AUDIO = 'audio',
    VIDEO = 'video'
}

export enum OutputMode {
    AUTO,
    TEXT,
    CHART,
    IMAGE
}

export enum ResourceType {
    TEXT = 1,
    IMAGE = 2
}
