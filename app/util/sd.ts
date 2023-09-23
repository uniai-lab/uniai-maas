/**
 * util for Stable Diffusion model API connect
 *
 * @format
 * @devilyouwei
 */

import $ from '@util/util'

export default {
    async imagine(prompt: string, nPrompt: string = '', width: number = 1024, height: number = 1024, num: number = 1) {
        const data: SDImagineRequest = {
            prompt,
            width,
            height,
            negative_prompt: nPrompt,
            enable_hr: false,
            denoising_strength: 0,
            firstphase_width: 0,
            firstphase_height: 0,
            hr_scale: 2,
            hr_upscaler: 'None',
            hr_second_pass_steps: 0,
            hr_resize_x: 0,
            hr_resize_y: 0,
            styles: [],
            seed: -1,
            subseed: -1,
            subseed_strength: 0,
            seed_resize_from_h: -1,
            seed_resize_from_w: -1,
            sampler_name: 'DPM++ SDE Karras',
            batch_size: 1,
            n_iter: num,
            steps: 50,
            cfg_scale: 7,
            restore_faces: false,
            tiling: false,
            do_not_save_samples: false,
            do_not_save_grid: false,
            eta: 0,
            s_min_uncond: 0,
            s_churn: 0,
            s_tmax: 0,
            s_tmin: 0,
            s_noise: 1,
            override_settings_restore_afterwards: true,
            script_args: [],
            sampler_index: 'DPM++ SDE Karras',
            script_name: '',
            send_images: true,
            save_images: true
        }

        return await $.post<SDImagineRequest, SDImagineResponse>(
            `${process.env.STABLE_DIFFUSION_API}/sdapi/v1/txt2img`,
            data
        )
    },
    async task() {
        return [await $.get<null, SDTaskResponse>(`${process.env.STABLE_DIFFUSION_API}/sdapi/v1/progress`)]
    }
}

export interface SDImagineRequest {
    enable_hr: boolean
    denoising_strength: number
    firstphase_width: number
    firstphase_height: number
    hr_scale: number
    hr_upscaler: string
    hr_second_pass_steps: number
    hr_resize_x: number
    hr_resize_y: number
    prompt: string
    styles: string[]
    seed: number
    subseed: number
    subseed_strength: number
    seed_resize_from_h: number
    seed_resize_from_w: number
    sampler_name: string
    batch_size: number
    n_iter: number
    steps: number
    cfg_scale: number
    width: number
    height: number
    restore_faces: boolean
    tiling: boolean
    do_not_save_samples: boolean
    do_not_save_grid: boolean
    negative_prompt: string
    eta: number
    s_min_uncond: number
    s_churn: number
    s_tmax: number
    s_tmin: number
    s_noise: number
    script_args: string[]
    sampler_index: string
    script_name: string
    send_images: boolean
    save_images: boolean
    override_settings_restore_afterwards: boolean
}

export interface SDImagineResponse {
    images: string[]
    info: string
    parameters: {}
}

export interface SDTaskResponse {
    progress: number
    eta_relative: number
    state: {
        skipped: boolean
        interrupted: boolean
        job: string
        job_count: number
        job_timestamp: string
        job_no: number
        sampling_step: number
        sampling_steps: number
    }
    current_image?: string
    textinfo?: string
}
