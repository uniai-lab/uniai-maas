/** @format */

import * as tf from '@tensorflow/tfjs-node'

export default {
    similarity([v1, v2]: number[][]) {
        const t1 = tf.tensor1d(v1)
        const t2 = tf.tensor1d(v2)
        const dotProduct = tf.dot(t1, t2)
        const magnitude1 = tf.sqrt(tf.dot(t1, t1))
        const magnitude2 = tf.sqrt(tf.dot(t2, t2))
        const magnitude = tf.mul(magnitude1, magnitude2)
        return tf.div(dotProduct, magnitude).arraySync()
    }
}
