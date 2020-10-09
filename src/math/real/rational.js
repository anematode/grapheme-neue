/**
 * @file This file allows floating-point numbers to be recognized consistently as rational or irrational, with a
 * customizable error rate.
 */
import { gcd } from './basic_arithmetic.js'
import { getExponent, pow2 } from './fp_manip.js'

/**
 * Return the closest rational number p/q to x where 0 < q <= maxDenominator and |p| <= maxNumerator. The algorithm is
 * described in Grapheme Theory, but the gist of it is we narrow in onto the number using a Farey sequence. The
 * numerator, denominator, and absolute error are returned in an array. If no satisfactory rational number can be found,
 * which means the error is more than 0.5, [ NaN, NaN, NaN ] is returned. To convert a double to a rational in a
 * generic way, doubleToRational should probably be used, which calls this internally with specially chosen values of
 * maxDenominator.
 * @param x {number} The number to find rational numbers near
 * @param maxDenominator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
 * @param maxNumerator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
 * @returns {number[]} A three-element array [ p, q, error ], where error is abs(x - p/q)
 */
export function closestRational (x, maxDenominator, maxNumerator = Number.MAX_SAFE_INTEGER) {
  // Some simple cases
  if (!Number.isFinite(x)) { return [NaN, NaN, NaN] }
  if (Number.isInteger(x)) {
    if (Math.abs(x) <= maxNumerator) {
      return [x, 1, 0]
    } else {
      return [NaN, NaN, NaN]
    }
  }

  // Make sure the result is within tolerances
  function certifyResult (arr) {
    if (Number.isNaN(arr[0]) || arr[0] > maxNumerator || arr[1] > maxDenominator || arr[2] > 0.5) { return [NaN, NaN, NaN] }
    return arr
  }

  const flr = Math.floor(x)

  // Starting fractions an/ad and bn/bd surround x
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
    if (cd > maxDenominator || cn > maxNumerator || bestErr === 0) return certifyResult([bestn, bestd, bestErr])

    const c = cn / cd

    if (c === x) return certifyResult([cn, cd, 0])

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

// Internal function used to convert a double to a rational; does the actual work.
function _doubleToRational (d) {
  if (d === 0) { return [0, 1] } else if (Number.isInteger(d)) { return [d, 1] }

  const negative = d < 0
  d = Math.abs(d)

  // Early exit conditions
  if (d <= 1.1102230246251565e-16 /** 2^-53 */ || d > 67108864 /** 2^26 */ || !Number.isFinite(d)) { return [NaN, NaN] }

  // Guaranteed that d > 0 and is finite, and that its exponent n is in the range [-52, 25] inclusive.
  const exp = getExponent(d)

  // We now look up the corresponding value of d_n, as explained in Grapheme Theory. It is offset by 52 because arrays
  // start from 0
  const dn = dnLookupTable[exp + 52]

  // We find the nearest rational number that satisfies our requirements
  const [p, q, err] = closestRational(d, dn, Number.MAX_SAFE_INTEGER)

  // Return the fraction if close enough, but rigorously so (see Theory)
  if (err <= pow2(exp - 52)) return [negative ? -p : p, q]

  return [NaN, NaN]
}

// Cached values for doubleToRational
let lastDoubleToRationalArg = 0
let lastDoubleToRationalRes = [0, 1]

/**
 * This function classifies floats, which are all technically rationals (more specifically, dyadic rationals), as
 * rational or irrational numbers. See Grapheme Theory, "Intelligent Pow" for more information. In short, at most
 * 1/10000 of floats are classified as rational, and the potential returned rational numbers vary depending on the
 * magnitude of d. The technique expounded is very general, and any fraction of floats being rational can be pretty
 * much guaranteed.
 * @param d {number} The number to convert to a rational
 * @param cache {boolean} Whether to cache the result to speed up later calls
 * @returns {number[]} Two-element array; first is the numerator, second is the denominator
 */
export function doubleToRational (d, cache = true) {
  if (d === lastDoubleToRationalArg) return lastDoubleToRationalRes

  const res = _doubleToRational(d)

  if (cache) {
    lastDoubleToRationalRes = res
    lastDoubleToRationalArg = d
  }

  return res
}
