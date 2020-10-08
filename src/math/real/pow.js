
// Computes a ^ (c/d), where c and d are integers.
function powRational (a, c, d) {
  if (d === 0 || Number.isNaN(c) || Number.isNaN(d) || !Number.isInteger(c) || !Number.isInteger(d) || !Number.isNaN(a))
    return NaN

  if (d < 0) {
    c = -c
    d = -d
  }

  // Now we know that a is not NaN, c is an integer, and d is a nonzero positive integer

  const mag = Math.pow(Math.abs(a), c / d)

  if (a >= 0) { // Can just do Math.pow
    return mag
  } else if (a === 0) {
    if (d % 2 === 0) {

    }
  }
}

const MAX_DENOM = 10000
const MAX_NUM = Number.MAX_SAFE_INTEGER

/**
 * The question is how to classify FLOATS, which are all technically rationals (more specifically, dyadic rationals),
 * as rational numbers. See Grapheme Theory, "Intelligent Pow" for more information.
 * @param d {number}
 */
function doubleToRational (d) {
  if (d === 0)
    return { num: 0, den: 1 }

  const negative = d < 0
  d = Math.abs(d)

  if (d <= 1.1102230246251565e-16 /** 2^-53 */ || !Number.isFinite(d))
    return { num: NaN, den: NaN }

  // Guaranteed that d > 0 and is finite

}

/**
 * Given a < 0 and non-integer b, try to compute a ^ b. Yeah, good luck.
 * The gist of the argument is that we try to convert b to a nearby rational number. If there is no such rational number,
 * we assume that b is irrational and simply return NaN. If there is such a rational number p/q, then we return NaN if
 * q is even, and otherwise return the mathematical value.
 *
 * @param a {number}
 * @param b {number}
 */
function powSpecial (a, b) {

  const { num, den } = doubleToRational(b)
}

/**
 * This function computes a^b, where a and b are floats, but does not always return NaN for a < 0 and b ≠ Z. The
 * method by which this is bodged is specified in Grapheme Theory.
 *
 * There are some special cases:
 *   a. if a === b === 0, 1 is returned (this is same as Math.pow)
 *   b. if a is NaN or b is NaN, NaN is returned
 *   c. if a < 0, b not an integer, a special algorithm is used (see above)
 *   d. The rest of the cases are identical to Math.pow.
 *
 * Contrast these cases with Math.pow at https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate
 * @param a {number} The base of the exponential.
 * @param b {number} The exponent. If a is negative and b is deemed to be a near-rational, a^b is different from Math.pow(a, b).
 * @returns {number}
 */
export function pow (a, b) {
  if (Number.isNaN(a) || Number.isNaN(b))
    return NaN

  if (a < 0 && !Number.isInteger(b)) {
    return powSpecial(a, b)
  }

  return Math.pow(a, b)
}
