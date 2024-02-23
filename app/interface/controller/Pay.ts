/** @format */

import { PayType } from '@interface/Enum'
import Decimal from 'decimal.js'

export interface CreatePayRequest {
    id: number
    type: PayType
}
export interface CreatePayResponse {
    id: number
    transactionId: string
    base64: string
}

export interface PayItem {
    id: number
    title: string
    description: string[]
    price: string
}

export interface WXNotifyRequest {
    id: string
    create_time: string
    resource_type: string
    event_type: string
    summary: string
    resource: {
        original_type: string
        algorithm: string
        ciphertext: string
        associated_data: string
        nonce: string
    }
}

export interface WXPaymentResult {
    mchid: string
    appid: string
    out_trade_no: string
    transaction_id: string
    trade_type: string
    trade_state: string
    trade_state_desc: string
    bank_type: string
    attach: string
    success_time: string
    payer: {
        openid: string
    }
    amount: {
        total: number
        payer_total: number
        currency: string
        payer_currency: string
    }
}

export interface CheckPayResponse {
    transactionId: string
    status: number
    amount: Decimal
    currency: string
}
