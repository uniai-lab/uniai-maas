/** @format */

interface CreateChatCompletionStreamResponse {
    id: string
    object: string
    created: number
    model: string
    choices: Array<CreateChatCompletionStreamResponseChoicesInner>
}

interface CreateChatCompletionStreamResponseChoicesInner {
    delta: { role?: string; content?: string }
    index: number
    finish_reason: string
}

type CreateChatCompletionStreamResponseCallback = (response: CreateChatCompletionStreamResponse) => void
