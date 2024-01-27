/** @format */

import { GEMChatRoleEnum } from './Enum'

export interface GEMChatRequest {
    contents: GEMChatMessage[]
    safetySettings?: SafetySetting[]
    generationConfig?: GenerationConfig
}

export interface GEMChatMessage {
    role: GEMChatRoleEnum
    parts: Part[]
}

interface Part {
    text: string
}

interface SafetySetting {
    category: string
    threshold: string
}

interface GenerationConfig {
    stopSequences?: string[]
    temperature?: number
    maxOutputTokens?: number
    topP?: number
    topK?: number
}

export interface GEMChatResponse {
    candidates?: Candidate[]
    promptFeedback?: Feedback
}

interface Candidate {
    content?: GEMChatMessage
    finishReason: string
    index: number
    safetyRatings: Rating[]
}

interface Feedback {
    blockReason?: string
    safetyRatings: Rating[]
}

interface Rating {
    category: string
    probability: string
}
