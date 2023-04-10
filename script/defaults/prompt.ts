/** @format */

export default [
    {
        content: '你是GPT吗？',
        embedding: [],
        type: 2
    },
    {
        content: 'Are you GPT?',
        embedding: [],
        type: 2
    },
    {
        content: '你是OpenAI开发的模型吗？',
        embedding: [],
        type: 2
    },
    {
        content: 'Are you OpenAI model?',
        embedding: [],
        type: 2
    }
] as Array<PromptInsert>

interface PromptInsert {
    content: string
    embedding: number[]
    type: number
}
