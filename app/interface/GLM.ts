/** @format */

interface GLMEmbeddingResponse {}
interface GLMChatResponse {
    content: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    model: string
    object: string
}
interface GLMChatRequest {
    prompt: string
    history?: string[][]
    max_length?: number
    top_p?: number
    temperature?: number
}
interface Text2VecResponse {
    model: string
    object: string
    data: number[][]
}
