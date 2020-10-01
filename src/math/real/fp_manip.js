/** Here we define functions for manipulation of double-precision floating point numbers.
 * Some definitions:
 *   special value: ±Infinity and any NaN
 *   normal number: Number which is not ±0 and whose exponent is nonzero
 *   denormal number: Number which is not ±0 and whose exponent is zero
 * */

/** Check endianness. The functions in this file will not work on big-endian systems, so we need to throw an error.
 * Credit goes to Lucio Pavia on StackOverflow, specifically the answer https://stackoverflow.com/a/52827031/13458117.
 * It is released under CC BY-SA 4.0, which is compatible with this project.
 */
const isBigEndian = (() => {
  const array = new Uint8Array(4)
  const view = new Uint32Array(array.buffer)
  return !((view[0] = 1) & array[0])
})()
if (isBigEndian) throw new Error('Grapheme only works on little-endian systems; your system is mixed- or big-endian.')

const floatStore = new Float64Array(1)
const intView = new Uint32Array(floatStore.buffer)

/**
 * Returns the next floating point number after a positive x, but doesn't account for special cases
 * @param x {number}
 * @returns {number}
 * @private
 */
function _roundUp (x) {
  floatStore[0] = x

  if (++intView[0] === 4294967296 /* uint32_max + 1 */) ++intView[1]

  return floatStore[0]
}

/**
 * Returns the previous floating point number before a POSITIVE x, but doesn't account for special cases
 * roundDown.
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
 * Special cases (±inf, NaNs, 0) are handled separately. An interesting special case is -Number.MIN_VALUE,
 * which would normally return -0 and thus must be handled separately. Then, the float is put into a TypedArray,
 * treated as an integer, and incremented, which sets it to the next representable value. roundUp should
 * NEVER return -0 or -Infinity, but it can accept those. On my computer both these functions take about
 * 20 ns / call (October 2020). They need to be performant because they are called so often (every interval
 * function, pretty much).
 * @param x {number}
 * @returns {number}
 */
export function roundUp (x) {
  // Special cases, where the float representation will mess us up
  if (x === Infinity) return Infinity
  if (x === -Infinity) return -Number.MAX_VALUE
  // since -0 === 0, deals with signed zero
  if (x === 0) return Number.MIN_VALUE
  if (Number.isNaN(x)) return NaN

  // Special case unique to roundUp
  if (x === -Number.MIN_VALUE) return 0

  return (x < 0) ? -_roundDown(-x) : _roundUp(x)
}

/**
 * Returns the previous floating point number before x. For example, roundUp(0) returns -Number.MIN_VALUE.
 * See roundUp for implementation explanation. This function should NEVER return -0 or +Infinity, but it
 * can accept those values; roundDown(0) is -Number.MIN_VALUE and roundDown(Infinity) is Number.MAX_VALUE
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

// The first positive normal number
const POSITIVE_NORMAL_MIN = 2.2250738585072014e-308

// The first negative normal number
const NEGATIVE_NORMAL_MAX = -POSITIVE_NORMAL_MIN

/**
 * Return whether a number is denormal; see https://en.wikipedia.org/wiki/Denormal_number. ±0 are not traditionally
 * considered to be denormal numbers. Denormal numbers are sometimes known as subnormal numbers.
 * @param x {number}
 * @returns {boolean}
 */
export function isDenormal (x) {
  return x !== 0 && x < POSITIVE_NORMAL_MIN && x > NEGATIVE_NORMAL_MAX
}
