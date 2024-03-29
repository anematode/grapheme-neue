/**
 * @file This file allows floating-point numbers to be recognized consistently as rational or irrational, with a
 * customizable error rate.
 */
import { getExponent, pow2, rationalExp } from './fp_manip.js'
import { assertRange } from '../../core/utils.js'

/**
 * Return the closest rational number p/q to x where 1 <= q <= maxDenominator and |p| <= maxNumerator. The algorithm is
 * described in Grapheme Theory, but the basic idea is that we express the given floating-point number as an exact
 * fraction, then expand its continued fraction and use it to find the best approximation.
 * @param x {number} The number to find rational numbers near
 * @param maxDenominator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
 * @param maxNumerator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
 * @returns {number[]} A three-element array [ p, q, error ], where error is abs(x - p/q) as calculated by JS
 */
export function closestRational (x, maxDenominator, maxNumerator = Number.MAX_SAFE_INTEGER) {
  if (x < 0) {
    const [ p, q, error ] = closestRational(-x, maxDenominator, maxNumerator)
    return [ -p, q, error ]
  }

  assertRange(maxDenominator, 1, Number.MAX_SAFE_INTEGER, 'maxDenominator')
  assertRange(maxNumerator, 1, Number.MAX_SAFE_INTEGER, 'maxNumerator')

  // Make integers
  maxDenominator = Math.round(maxDenominator)
  maxNumerator = Math.round(maxNumerator)

  // Some simple cases
  if (!Number.isFinite(x)) { return [ NaN, NaN, NaN ] }
  if (Number.isInteger(x)) {
    if (x <= maxNumerator) {
      return [ x, 1, 0 ]
    }
  } else if (maxDenominator === 1) {
    const rnd = Math.min(maxNumerator, Math.round(x))

    return [ rnd, 1, Math.abs(rnd - x) ]
  }

  if (x > maxNumerator) {
    // Closest we can get, unfortunately
    return [ maxNumerator, 1, Math.abs(maxNumerator - x) ]
  }

  // Floor and fractional part of x
  const flr = Math.floor(x)

  // Guaranteed to be in (0, 1) and to be exact
  const frac = x - flr

  // frac = exactFracNum / (exactFracDenWithoutExp * 2 ^ exp) = exactN / exactD (last equality is by definition); exp >= 0 guaranteed
  const [ exactFracNum, exactFracDenWithoutExp, expN ] = rationalExp(frac)
  const exp = -expN

  // exactFracDen = exactD; exactFracNum = exactN. Note that x * 2^n is always exactly representable, so exactFracDen
  // is exact even though it may be greater than MAX_SAFE_INTEGER. Occasionally, this will overflow to Infinity, but
  // that is okay; we just return 0.
  const exactFracDen = exactFracDenWithoutExp * pow2(exp)

  if (exactFracDen === Infinity) return [ 0, 1, x ]

  // We express frac as a continued fraction. To do this, we start with the definition that frac = exactN/exactD.
  // Then frac = 0 + 1 / (floor(exactD/exactN) + 1 / (exactN / mod(exactD,exactN))). Note that
  // the term mod(eD,eN) / eN is always representable exactly, since eN <= MAX_SAFE_INTEGER, and the rest of the
  // continued fraction can be evaluated. The calculation of floor(exactD/exactN) is troublesome given that exactD may
  // be greater than Number.MAX_SAFE_INTEGER, and that the calculation MUST be exact. What may indeed happen is that
  // exactD/exactN will have a value below an integer, but close to that integer, and then will round to that integer.
  // We get around this by using the calculated value for modDN, which IS exact, to nudge it towards the real answer.
  // Eventually I will prove this will always work, but it's worth pointing out that if the quotient is MASSIVE so that
  // the nudging makes no difference, then a small error doesn't matter because the convergent will be too big for
  // consideration anyway.
  const modDN = exactFracDen % exactFracNum
  const flrDN = Math.round(exactFracDen / exactFracNum - modDN / exactFracNum)

  let contFracGeneratorNum = exactFracNum
  let contFracGeneratorDen = modDN

  // Define a recursive function d(i+1) = c_(i+1) * d(i) + d(i-1), where c_i is the ith term (indexed from 1) of the
  // continued fraction, as well as n(i+1) = c_(i+1) * n(i) + n(i-1). Then n(i+1) / d(i+1) is indeed the (i+1)th
  // convergent of the continued fraction. Thus, we store the previous two numerators and denominators, which is all we
  // need to calculate the next convergent.

  // n_(i-1), n_i, d_(i-1), d_i, starting at i = 1
  let nnm1 = 1
  let nn = flr
  let dnm1 = 0
  let dn = 1

  // Store the best numerators and denominators found so far
  let bestN = Math.round(x)
  let bestD = 1

  // Same indexing variable as Grapheme Theory. In case there's a bug I don't know about; it should terminate in < 55 steps
  for (let i = 2; i < 100; ++i) {
    // term is equivalent to c_i from Grapheme theory
    let term, rem

    if (i !== 2) { // All steps besides the first
      term = Math.floor(contFracGeneratorNum / contFracGeneratorDen)
      rem = contFracGeneratorNum % contFracGeneratorDen

      contFracGeneratorNum = contFracGeneratorDen
      contFracGeneratorDen = rem
    } else { // The first step is special, since we have already specially computed these values
      term = flrDN
      rem = modDN
    }

    // nnp1 and dnp1 are equivalent to Grapheme Theory's n_i and d_i
    let nnp1 = term * nn + nnm1
    let dnp1 = term * dn + dnm1

    // Having computed the next convergent, we see if it meets our criteria. If it does not, we see whether a reduction
    // of that convergent can produce a fraction of better accuracy. If that is so, we return this reduced
    // value; otherwise, we return bestN/bestD, which we know to be a valid (and best possible) approximation.
    if (nnp1 <= maxNumerator && dnp1 <= maxDenominator) {
      bestN = nnp1
      bestD = dnp1
    } else {
      // Check for reduced. term_r is a valid reduction if term_reduced > term / 2 (except for a special case
      // which we'll deal with shortly) and the resulting values of nnp1 and dnp1 are within bounds. Thus,
      // term_r * nn + nnm1 <= maxNumerator and term_r * dn + dnm1 <= maxDenominator. Some finagling results in
      // term_r <= (maxNumerator - nnm1) / nn and term_r <= (maxDenominator - dnm1) / dn, thus we have our final ineq,
      // term / 2 < term_r <= Math.min((maxNumerator - nnm1) / nn, (maxDenominator - dnm1) / dn).
      const maxTermR = Math.floor(Math.min((maxNumerator - nnm1) / nn, (maxDenominator - dnm1) / dn))
      const minTermR = term / 2

      if (maxTermR >= minTermR) {
        // reduced semiconvergent (maybe) possible
        nnp1 = maxTermR * nn + nnm1
        dnp1 = maxTermR * dn + dnm1

        if (maxTermR > minTermR) {
          bestN = nnp1
          bestD = dnp1
        } else {
          // rare special case. We check whether bestN/bestD is a BETTER convergent than this, and select the better one.
          const reduced = nnp1 / dnp1
          const oldBest = bestN / bestD

          if (Math.abs(reduced - x) < Math.abs(oldBest - x)) {
            bestN = nnp1
            bestD = dnp1
          }
        }
      }

      break
    }

    if (rem === 0) break

    // Store history of values
    nnm1 = nn
    nn = nnp1
    dnm1 = dn
    dn = dnp1
  }

  const quot = bestN / bestD

  return [ bestN, bestD, Math.abs(quot - x) ]
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
  if (d === 0) { return [ 0, 1 ] } else if (Number.isInteger(d)) { return [ d, 1 ] }

  const negative = d < 0
  d = Math.abs(d)

  // Early exit conditions
  if (d <= 1.1102230246251565e-16 /** 2^-53 */ || d > 67108864 /** 2^26 */ || !Number.isFinite(d)) { return [ NaN, NaN ] }

  // Guaranteed that d > 0 and is finite, and that its exponent n is in the range [-52, 25] inclusive.
  const exp = getExponent(d)

  // We now look up the corresponding value of d_n, as explained in Grapheme Theory. It is offset by 52 because arrays
  // start from 0
  const dn = dnLookupTable[exp + 52]

  // We find the nearest rational number that satisfies our requirements
  const [ p, q, err ] = closestRational(d, dn, Number.MAX_SAFE_INTEGER)

  // Return the fraction if close enough, but rigorously so (see Theory)
  if (err <= pow2(exp - 52)) return [ negative ? -p : p, q ]

  return [ NaN, NaN ]
}

// Cached values for doubleToRational
let lastDoubleToRationalArg = 0
let lastDoubleToRationalRes = [ 0, 1 ]

/**
 * This function classifies floats, which are all technically rationals (more specifically, dyadic rationals), as
 * rational or irrational numbers. See Grapheme Theory, "Intelligent Pow" for more information. In short, at most
 * 1/10000 of floats are classified as rational, and the potential returned rational numbers vary depending on the
 * magnitude of d. The technique expounded is very general, and any fraction of floats being rational can be pretty
 * much guaranteed. Takes about 0.0004 ms / call on my computer.
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
