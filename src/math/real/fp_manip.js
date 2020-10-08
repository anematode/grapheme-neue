/** Here we define functions for manipulation of double-precision floating point numbers.
 * Some definitions:
 *   special value: ±Infinity and any NaN
 *   normal number: Number which is not ±0 and whose exponent is nonzero
 *   denormal number: Number which is not ±0 and whose exponent is zero
 * */

/** Check endianness. The functions in this file will not work on big-endian systems, so we need to throw an error.
 * Credit goes to Lucio Pavia on StackOverflow, specifically
 * {@link https://stackoverflow.com/a/52827031/13458117|this answer}.
 * It is released under CC BY-SA 4.0, which is compatible with this project.
 * @ignore
 */
const isBigEndian = (() => {
  const array = new Uint8Array(4)
  const view = new Uint32Array(array.buffer)
  return !((view[0] = 1) & array[0])
})()
if (isBigEndian) throw new Error('only works on little-endian systems; your system is mixed- or big-endian.')

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

  if (++intView[0] === 4294967296 /* uint32_max + 1 */) ++intView[1]

  return floatStore[0]
}

/**
 * Returns the previous floating point number before a POSITIVE x, but doesn't account for special cases.
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
 * @param x {number} Any valid floating-point number
 * @returns {number} The next representable floating-point number, handling special cases
 * @function roundUp
 * @memberOf FP
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
 * See {@link FP.roundUp} for implementation explanation. This function should NEVER return -0 or
 * +Infinity, but it can accept those values; roundDown(0) is -Number.MIN_VALUE and roundDown(Infinity) is
 * Number.MAX_VALUE.
 * @param x {number} Any valid floating-point number
 * @returns {number} The previous representable floating-point number, handling special cases
 * @function roundDown
 * @memberOf FP
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
 * Return whether a number is denormal; see {@link https://en.wikipedia.org/wiki/Denormal_number|Wikipedia} for a
 * technical explanation of what this means. ±0 are not considered denormal numbers. Denormal numbers are sometimes
 * known as subnormal numbers.
 * @param x {number} Any valid floating-point number
 * @returns {boolean} Whether the number is a denormal number
 * @function isDenormal
 * @memberOf FP
 */
export function isDenormal (x) {
  // Note that NaN will return false, since NaN < anything is false.
  return x !== 0 && x < POSITIVE_NORMAL_MIN && x > NEGATIVE_NORMAL_MAX
}

// unused... might use it later
function reverseUint32 (x) {
  x = (x & 0x55555555)  <<   1 | (x & 0xAAAAAAAA) >>>  1;
  x = (x & 0x33333333)  <<   2 | (x & 0xCCCCCCCC) >>>  2;
  x = (x & 0x0F0F0F0F)  <<   4 | (x & 0xF0F0F0F0) >>>  4;
  x = (x & 0x00FF00FF)  <<   8 | (x & 0xFF00FF00) >>>  8;
  x = (x & 0x0000FFFF)  <<  16 | (x & 0xFFFF0000) >>> 16;

  return x >>> 0;
}

/**
 * Get the non-biased exponent of a floating-point number x. Equivalent mathematically to floor(log2(abs(x))) for
 * finite values, but more accurate as the precision of log2 is not technically guaranteed.
 * @param x
 * @returns {number}
 */
export function getExponent (x) {
  floatStore[0] = x

  // Mask the biased exponent, retrieve it and convert it to non-biased
  return ((intView[1] & 0x7ff00000) >> 20) - 1023
}

/**
 * Converts a floating-point number into a fraction in [0.5, 1), except special cases, and a power of 2 to multiply it by.
 * @param x
 * @returns {Array} [fraction, exponent]
 */
export function frexp (x) {
  if (x === 0 || !Number.isFinite(x)) {
    return [x, 0]
  }

  // +1 so that the fraction is between
  const exp = getExponent(x) + 1

  return [ x / Math.pow(2, exp), exp ]
}

// Credit to {@link https://stackoverflow.com/a/55592455/13458117} by User "Yannis T.", licensed under CC BY-SA 4.0.
export const floatRegex = /^(?<sign>[+-]?)((?<significand1>\d+([.]\d*)?)([eE](?<exp1>[+-]?\d+))?|(?<significand2>[.]\d+)([eE](?<exp2>[+-]?\d+))?)$/

/**
 * Given a string, return whether it is a valid string representing a real number. "inf" and "undefined" aren't included
 * here.
 * @param str {string} The string to check.
 * @returns {boolean} Whether it is a valid float.
 */
export function isValidGraphemeReal (str) {
  return floatRegex.test(str)
}

/**
 * Gets the significand from a float string.
 * @param str {string}
 * @returns {string}
 */
function getSignificand (str) {
  const match = str.match(floatRegex)
  if (!match) return ""

  const groups = match.groups
  return groups.significand1 || groups.significand2
}

/**
 * Returns whether str can be represented exactly as a float. For example, "0", "0.00000", "1", "1109519", "-14518924",
 * "-1.5", "-1.5e3", "4.25", "42.5e-1". Floats allowed by Grapheme are relatively simple; they are of the form
 * "... numeric ... [eE]? ... integer ...".
 *
 * The function is not perfect by any means, and it errs on the side of caution. Even if the function returns false, it might
 * actually be exactly representable. I might write a guaranteed version of this function if I ever get into arbitrary-precision
 * floats.
 *
 * Actually this function is terrible. Whatever.
 * @param str {string}
 * @returns
 */
export function toExactFloat (str) {
  // Floats are basically just exciting dyadic rationals.
  // TODO

  return NaN

  /*const match = str.match(floatRegex)
  if (!match) return false

  const groups = match.groups
  const significand = groups.significand1 || groups.significand2
  const exponent = groups.exp1 || groups.exp2

  if (exponent) {

  }*/

}
