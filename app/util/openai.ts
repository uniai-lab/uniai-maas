/**
 * Utility for connecting to the GPT model API.
 *
 * @format prettier
 * @author devilyouwei
 */

import { GPTImagineRequest, GPTImagineResponse, GPTImagineSize } from '@interface/OpenAI'
import $ from '@util/util'

// Destructure environment variables
const { OPENAI_API, OPENAI_KEY } = process.env
const DEFAULT_API = 'https://api.openai.com'
const API_VERSION = 'v1'

export default {
    /**
     * Generates images based on a prompt.
     *
     * @param prompt - The prompt for image generation.
     * @param nPrompt - The negative prompt (optional).
     * @param width - Image width (default: 1024).
     * @param height - Image height (default: 1024).
     * @param n - Number of images to generate (default: 1).
     * @returns A promise resolving to the image generation response.
     */
    async imagine(prompt: string, nPrompt: string = '', width: number = 1024, height: number = 1024, n: number = 1) {
        return await $.post<GPTImagineRequest, GPTImagineResponse>(
            `${OPENAI_API || DEFAULT_API}/${API_VERSION}/images/generations`,
            {
                prompt: `Positive prompt: ${prompt}\nNegative prompt: ${nPrompt}`,
                n,
                size: `${width}x${height}` as GPTImagineSize
            },
            { headers: { Authorization: `Bearer ${OPENAI_KEY}` }, responseType: 'json' }
        )
    }
}
