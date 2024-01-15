/** @format */

export interface BaiduAccessTokenRequest {
    grant_type: string
    client_id: string
    client_secret: string
}
export interface BaiduAccessTokenResponse {
    access_token: string // 访问凭证
    expires_in: number // 有效期，单位秒
    error?: string // 错误码，可选字段，仅在响应失败时返回
    error_description?: string // 错误描述信息，可选字段，仅在响应失败时返回
    session_key?: string // 暂时未使用，可忽略
    refresh_token?: string // 暂时未使用，可忽略
    scope?: string // 暂时未使用，可忽略
    session_secret?: string // 暂时未使用，可忽略
}

export interface BaiduChatMessage {
    role: 'user' | 'assistant' | 'function'
    content: string
    name?: string
    function_call?: FunctionCall
}

export interface FunctionCall {
    name: string
    arguments: string
    thoughts?: string
}

export interface BaiduChatRequest {
    messages: BaiduChatMessage[]
    functions?: Function[]
    temperature?: number
    top_p?: number
    penalty_score?: number
    stream?: boolean
    system?: string
    stop?: string[]
    disable_search?: boolean
    enable_citation?: boolean
    max_output_tokens?: number
    user_id?: string
    tool_choice?: ToolChoice
}

export interface Function {
    name: string
    description: string
    parameters: object // 这里需要更具体的 JSON Schema 定义
    responses?: object // 这里需要更具体的 JSON Schema 定义
    examples?: Example[]
}

export interface Example {
    role: 'user' | 'assistant' | 'function'
    content: string
    name?: string
    function_call?: FunctionCall
}

export interface ToolChoice {
    type: 'function'
    function: Function
    name: string
}

export interface BaiduChatResponse {
    id: string
    object: string
    created: number
    sentence_id?: number // 只有在流式接口模式下才会返回
    is_end?: boolean // 只有在流式接口模式下才会返回
    is_truncated: boolean
    finish_reason: 'normal' | 'stop' | 'length' | 'content_filter' | 'function_call'
    search_info?: SearchInfo
    result: string
    need_clear_history: boolean
    ban_round?: number
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
        plugins: PluginUsage[]
    }
    function_call?: FunctionCall
    error_code?: number
    error_msg?: string
}

export interface SearchInfo {
    search_results: SearchResult[]
}

export interface SearchResult {
    index: number
    url: string
    title: string
}

export interface PluginUsage {
    name: string
    parse_tokens: number
    abstract_tokens: number
    search_tokens: number
    total_tokens: number
}
