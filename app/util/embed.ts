/** @format */

import * as tf from '@tensorflow/tfjs-node'

const PATH = process.env.SAVE_MODEL_PATH

export default {
    async use(texts: string[]): Promise<any> {
        const inputs = tf.tensor(texts)
        const model = await tf.node.loadSavedModel(`${PATH}/universal-sentence-encoder`)
        const outputs = model.predict(inputs)
        return (outputs as tf.Tensor).arraySync()
    }
}
