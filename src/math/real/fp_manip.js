/** Here we define convenience functions for manipulation of floating point numbers. */

const floatStore = new Float64Array(1)
const intView = new Uint32Array(floatStore.buffer)

/**
 * Returns the next floating point number after a positive x, but doesn't account for special cases.
 * @param x {number}
 * @returns {number}
 * @private
 */
function _roundUp (x) {
  floatStore[0] = x

  if (++intView[0] === 0) ++intView[1]

  return floatStore[0]
}

/**
 * Returns the previous floating point number before a positive x, but doesn't account for special cases.
 * @param x {number}
 * @returns {number}
 * @private
 */
function _roundDown (x) {
  floatStore[0] = x

  if (--intView[0] === -1) --intView[1]

  return floatStore[0]
}

/**
 * Returns the next floating point number after x. For example, roundUp(0) returns Number.MIN_VALUE.
 * Special cases (±inf, NaNs, 0) are handled separately. Then, the float is put into a TypedArray,
 * treated as an integer, and incremented, which sets it to the next representable value.
 * @param x {number}
 * @returns {number}
 */
export function roundUp (x) {
  // Special cases, where the float representation will mess us up
  if (x === Infinity) return Infinity
  if (x === -Infinity) return -Number.MAX_VALUE
  if (x === 0) return Number.MIN_VALUE
  if (Number.isNaN(x)) return NaN

  return (x < 0) ? -_roundDown(-x) : _roundUp(x)
}

/**
 * Returns the previous floating point number before x. For example, roundUp(0) returns -Number.MIN_VALUE.
 * See roundUp for implementation explanation.
 * @param x {number}
 * @returns {number}
 */
export function roundDown (x) {
  if (x === Infinity) return Number.MAX_VALUE
  if (x === -Infinity) return -Infinity
  if (x === 0) return -Number.MIN_VALUE
  if (Number.isNaN(x)) return NaN

  return (x < 0) ? -_roundUp(-x) : _roundDown(x)
}
