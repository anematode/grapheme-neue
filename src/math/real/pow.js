import { getExponent } from './fp_manip.js'
import { gcd } from './basic_arithmetic.js'

// Computes a ^ (c/d), where c and d are integers.
function powRational (a, c, d) {
  // Simple return cases
  if (d === 0 || Number.isNaN(c) || Number.isNaN(d) || !Number.isInteger(c) || !Number.isInteger(d) || Number.isNaN(a)) { return NaN }

  if (a === 0) return 0

  const evenDenom = d % 2 === 0
  const evenNumer = c % 2 === 0

  if (evenDenom && a < 0) return NaN

  if (d < 0) {
    c = -c
    d = -d
  }

  // Now we know that a is not NaN, c is an integer, and d is a nonzero positive integer. Also, the answer is not NaN.
  const mag = Math.pow(Math.abs(a), c / d)

  if (a >= 0) { // Can just do Math.pow
    return mag
  } else if (a === 0) {
    return 0
  } else {
    // We know that evenDenom is false
    return evenNumer ? mag : -mag
  }
}

/**
 * Return the closest rational number p/q to x where q < maxDenominator and p < maxNumerator.
 * @param x {number}
 * @param maxDenominator {number}
 * @param maxNumerator {number}
 * @returns {number[]} A three-element array [ p, q, error ], where error is abs(x - p/q)
 */
function closestRational (x, maxDenominator, maxNumerator = Number.MAX_SAFE_INTEGER) {
  const flr = Math.floor(x)

  // If we find frac is approximately p/q, the true numerator is q * flr + p. Thus, the maximum numerator is dn - q * flr

  let an = flr
  let ad = 1
  let bn = flr + 1
  let bd = 1

  while (true) {
    // Compute middle in Farey sequence
    let cn = an + bn
    let cd = ad + bd

    // Reduce fraction
    const g = gcd(cn, cd)
    if (g !== 1) {
      cn /= g
      cd /= g
    }

    // Compute both sides
    const a = an / ad
    const b = bn / bd

    const errA = x - a
    const errB = b - x

    let bestn
    let bestd
    let bestErr

    // Which approximation is better? Store it in bestn, bestd, bestErr
    if (errA < errB) {
      bestn = an
      bestd = ad
      bestErr = errA
    } else {
      bestn = bn
      bestd = bd
      bestErr = errB
    }

    // If numerator or denominator are too big, or the approximation is exact, return the approximation
    if (cd > maxDenominator || cn > maxNumerator || bestErr === 0) return [bestn, bestd, bestErr]

    const c = cn / cd

    if (c === x) return [cn, cd, 0]

    if (x < c) {
      bn = cn
      bd = cd
    } else {
      an = cn
      ad = cd
    }
  }
}

// [...Array(53 + 25).keys()].map(n => { n = n - 52; return Math.floor(Math.min(Math.PI * 2 ** (26 - n/2) / 300, Number.MAX_SAFE_INTEGER)) })
const dnLookupTable = [
  47161585013522, 33348276574567, 23580792506761, 16674138287283, 11790396253380, 8337069143641, 5895198126690,
  4168534571820, 2947599063345, 2084267285910, 1473799531672, 1042133642955, 736899765836, 521066821477, 368449882918,
  260533410738, 184224941459, 130266705369, 92112470729, 65133352684, 46056235364, 32566676342, 23028117682,
  16283338171, 11514058841, 8141669085, 5757029420, 4070834542, 2878514710, 2035417271, 1439257355, 1017708635,
  719628677, 508854317, 359814338, 254427158, 179907169, 127213579, 89953584, 63606789, 44976792, 31803394, 22488396,
  15901697, 11244198, 7950848, 5622099, 3975424, 2811049, 1987712, 1405524, 993856, 702762, 496928, 351381, 248464,
  175690, 124232, 87845, 62116, 43922, 31058, 21961, 15529, 10980, 7764, 5490, 3882, 2745, 1941, 1372, 970, 686, 485,
  343, 242, 171, 121
]

function _doubleToRational (d) {
  if (d === 0) { return [0, 1] } else if (Number.isInteger(d)) { return [d, 1] }

  const negative = d < 0
  d = Math.abs(d)

  if (d <= 1.1102230246251565e-16 /** 2^-53 */ || d > 67108864 /** 2^26 */ || !Number.isFinite(d)) { return [NaN, NaN] }

  // Guaranteed that d > 0 and is finite, and that its exponent n is in the range [-52, 25] inclusive.
  const exp = getExponent(d)

  // We now look up the corresponding value of d_n, as explained in Grapheme Theory. It is offset by 52 because arrays
  // start from 0
  const dn = dnLookupTable[exp + 52]

  // We find the nearest rational number that satisfies our requirements
  const [p, q, err] = closestRational(d, dn)

  // Close enough, but rigorously so (see Theory)
  if (err <= Math.pow(2, exp - 52)) return [negative ? -p : p, q]

  return [NaN, NaN]
}

let lastDoubleToRationalArg = 0
let lastDoubleToRationalRes = [0, 1]

/**
 * Cached wrapper for _doubleToRational. The question is how to classify FLOATS, which are all technically rationals
 * (more specifically, dyadic rationals), as rational numbers. See Grapheme Theory, "Intelligent Pow" for more
 * information. In short, at most 1/10000 of floats are classified as rational, and the potential returned rational
 * numbers vary depending on the magnitude of d.
 * @param d {number}
 * @returns {number[]} Two-element array; first is the numerator, second is the denominator
 */
export function doubleToRational (d) {
  if (d === lastDoubleToRationalArg) return lastDoubleToRationalRes

  const res = _doubleToRational(d)

  lastDoubleToRationalRes = res
  lastDoubleToRationalArg = d

  return res
}

/**
 * Given a < 0 and non-integer b, try to compute a ^ b. Yeah, good luck Tim.
 * The gist of the argument is that we try to convert b to a nearby rational number. If there is no such rational number,
 * we assume that b is irrational and simply return NaN. If there is such a rational number p/q, then we return NaN if
 * q is even, and otherwise return the mathematical value.
 *
 * @param a {number}
 * @param b {number}
 */
function powSpecial (a, b) {
  const [num, den] = doubleToRational(b)

  // deemed irrational
  if (!den) return NaN

  // integer
  if (den === 1) return Math.pow(a, num)

  return powRational(a, num, den)
}

/**
 * This function computes a^b, where a and b are floats, but does not always return NaN for a < 0 and b ≠ Z. The
 * method by which this is bodged is specified in Grapheme Theory. For the special cases, it takes about 0.006 ms per
 * evaluation on my computer.
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
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN

  if (a < 0 && a > -Infinity && !Number.isInteger(b)) return powSpecial(a, b)

  return Math.pow(a, b)
}
