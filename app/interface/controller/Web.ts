/** @format */

export interface SMSCodeRequest {
    phone: string
}
export interface SMSCodeResponse {
    id: number
    phone: string
}
export interface LoginRequest {
    phone: string
    code: string
}
