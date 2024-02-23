/** @format */

import { ChatModelProvider, ModelProvider } from 'uniai'

export interface ConfigTask {
    title: string
    tip: string
    button: string
    type: number
}

export interface ConfigMenu {
    image: string
    title: string
    tip: string
}
export interface ConfigMenuV2 {
    icon: string
    title: string
    tip: string
    show: boolean
}

export interface ConfigVIP {
    bgImg: string
    bgLine: string
    bgStar: string
    titleImg: string
    backgroundColor: string
    boxShadow: string
    linearGradient: string
    color: string
    desc: string
    benefits: Benefit[]
}

export interface Benefit {
    image: string
    title: string
    tip: string
    iconShadow: string
    tipColor: string
}

export type LevelModel = {
    [key in ChatModelProvider]: number
}
