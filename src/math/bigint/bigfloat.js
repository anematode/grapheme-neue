
// A float is of the following form: sign * (2^30)^e * m, where m is a list of 30-bit words that contain the mantissa of
// the float. m = m_1 / 2^30 + m_2 / 2^60 + ... . The precision is the number of bits kept track of in the words. Since
// the start of the significant bits can occur anywhere from 0 to 29 bits into the first word,

import {getExponent, getMantissa, isDenormal, pow2} from "../real/fp_manip"
import {ROUNDING_MODE} from "../rounding_modes"
import {leftZeroPad} from "../../core/utils"

const BIGFLOAT_WORD_BITS = 30
const BIGFLOAT_WORD_SIZE = 1 << BIGFLOAT_WORD_BITS
const BIGFLOAT_WORD_MAX = BIGFLOAT_WORD_SIZE - 1

let CURRENT_PRECISION = 53
let CURRENT_ROUNDING_MODE = ROUNDING_MODE.NEAREST

function getMantissaForPrecision (prec) {
  return new Int32Array(Math.ceil((prec - 1) / BIGFLOAT_WORD_BITS + 1))
}

/**
 * Truncate a mantissa to a given precision in place, effectively removing all significant digits past the prec'th digit
 * and thus always decreases the magnitude of the number. Assumes the first significant word is already at the
 * beginning.
 * @param mantissa
 * @param prec
 */
export function truncateMantissaToPrecisionInPlace (mantissa, prec) {
  let mantissaLen = mantissa.length

  // How many ghost bits there are at the beginning
  let offset = Math.clz32(mantissa[0]) - 2

  // Which BIT to start truncating at, indexing from 0
  let trunc = (prec + offset)
  let truncWord = Math.floor(trunc / BIGFLOAT_WORD_BITS)
  if (truncWord >= mantissaLen) return

  // Truncate the first truncatable word at the correct bit, which means removing the last (30 - (trunc - truncWord * 30)) bits
  // tlen is between 1 and 30, inclusive
  let tlen = BIGFLOAT_WORD_BITS - (trunc - truncWord * BIGFLOAT_WORD_BITS)
  mantissa[truncWord] = (mantissa[truncWord] >> tlen) << tlen

  for (; ++truncWord < mantissaLen; ) {
    mantissa[truncWord] = 0
  }

  return mantissa
}

/**
 * Round an (unsigned) mantissa to a given precision in place, in one of a few rounding modes.
 * @param mantissa
 * @param prec
 * @param roundingMode
 * @returns {number} Carry bit; if the rounding operation leads to a carry, return 1, else return 0.
 */
export function roundMantissaToPrecisionInPlace (mantissa, prec, roundingMode=CURRENT_ROUNDING_MODE) {
  let mantissaLen = mantissa.length

  // How many ghost bits there are at the beginning
  let offset = Math.clz32(mantissa[0]) - 2

  // Which BIT to start truncating at, indexing from 0
  let trunc = (prec + offset)
  let truncWord = Math.floor(trunc / BIGFLOAT_WORD_BITS)
  if (truncWord >= mantissaLen) return

  // Number of bits to truncate off the word
  let truncateLen = BIGFLOAT_WORD_BITS - (trunc - truncWord * BIGFLOAT_WORD_BITS)

  if (roundingMode === ROUNDING_MODE.DOWN || roundingMode === ROUNDING_MODE.TOWARD_ZERO) {
    // Straight up truncation
    mantissa[truncWord] = (mantissa[truncWord] >> truncateLen) << truncateLen

    // Fill the remainder with 0s
    for (; ++truncWord < mantissaLen; ) {
      mantissa[truncWord] = 0
    }

    return 0 // no carry
  }

  let doCarry = false

  let word = mantissa[truncWord]
  let truncatedWord = (word >> truncateLen) << truncateLen

  mantissa[truncWord] = truncatedWord
  let rem = word - truncatedWord

  doCarry: if (roundingMode === ROUNDING_MODE.UP || roundingMode === ROUNDING_MODE.TOWARD_INF) {
    if (rem > 0) {
      doCarry = true
    } else for (let i = truncWord + 1; i < mantissaLen; ++i) {
      if (mantissa[i] !== 0) {
        doCarry = true
        break
      }
    }
  } else {
    // Truncated amounts less than this mean round down; more means round up; equals means needs to check whether the
    // rest of the limbs are 0
    let splitPoint = 1 << (truncateLen - 1)

    if (rem < splitPoint) return 0
    else if (rem > splitPoint) doCarry = true
    else for (let i = truncWord + 1; i < mantissaLen; ++i) {
      if (mantissa[i] !== 0) {
        doCarry = true
        break doCarry
      }
    }

    // Tie!
    if (roundingMode === ROUNDING_MODE.TIES_EVEN) {
      // We only do the carry if it would give an even bit at the end. To do this we query for the bit which will be
      // affected (the truncateLen th bit). If truncateLen is 30 then we have to look at the preceding word.

      let bit = (truncateLen === 30) ? (mantissa[truncWord - 1] & 1) : ((mantissa[truncWord] >> truncateLen) & 1)

      if (bit) doCarry = true
    } else {
      // ties away from zero; always carry
      doCarry = true
    }
  }

  // Fill trailing words with 0
  for (let j = truncWord; ++j < mantissaLen; ) {
    mantissa[j] = 0
  }

  if (doCarry) {
    // Carry amount. Note that in the case of truncateLen = 30 we'll add 1 << 30 to a word, then immediately carry it
    // to the next word, so everything works out correctly
    let carry = 1 << truncateLen

    for (let j = truncWord; j >= 0; --j) {
      let word = mantissa[j] + carry

      if (word > BIGFLOAT_WORD_MAX) {
        word -= BIGFLOAT_WORD_SIZE
        carry = 1
        mantissa[j] = word
      } else {
        mantissa[j] = word
        carry = 0
        break
      }
    }

    if (carry !== 0) return carry
  }

  return 0
}

export class BigFloat {
  constructor (sign, exponent, precision, mantissa) {
    this.sign = sign
    this.exp = exponent
    this.prec = precision
    this.mant = mantissa
  }

  static fromNumber (num, { precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE } = {}) {
    if (num === 0 || !Number.isFinite(num)) {
      return new BigFloat(num + 0, 0, precision, getMantissaForPrecision(precision))
    }

    const outMantissa = getMantissaForPrecision(precision)

    let isNumDenormal = isDenormal(num)
    let valExponent = getExponent(num)
    let valMantissa = getMantissa(num)

    // Exponent of the float (2^30)^newExp
    let newExp = Math.ceil((valExponent + 1) / BIGFLOAT_WORD_BITS)

    // The mantissa needs to be shifted to the right by this much. 0 < bitshift <= 30
    let bitshift = newExp * BIGFLOAT_WORD_BITS - valExponent

    let denom = pow2(bitshift + 22)
    outMantissa[0] = Math.floor(valMantissa / denom) /* from double */ + (isNumDenormal ? 0 : (1 << (30 - bitshift))) /* add 1 if not denormal */

    let rem = valMantissa % denom
    if (rem > BIGFLOAT_WORD_MAX) {
      let cow = 1 << (bitshift - 8)

      outMantissa[1] = Math.floor(rem / cow)
      outMantissa[2] = (rem % cow) << (38 - bitshift)
    } else {
      outMantissa[1] = rem << (8 - bitshift)
    }

    // Special handling; for extremely small denormal numbers, the first word is 0, so we shift them over
    if (isNumDenormal && outMantissa[0] === 0) {
      outMantissa[0] = outMantissa[1]
      outMantissa[1] = outMantissa[2]
      outMantissa[2] = 0

      newExp -= 1
    }

    return new BigFloat(Math.sign(num), newExp, precision, outMantissa)
  }

  /**
   * Truncate the bits of this number to prec bits, with the given rounding mode
   * @param prec
   * @param roundingMode
   */
  truncateToPrecision (prec, roundingMode = CURRENT_ROUNDING_MODE) {

  }

  /**
   * Convert this float into a float with a different precision, rounded in the correct direction
   * @param precision
   * @param roundingMode
   */
  toBigFloat ({ precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE }) {
    const mantissaOut = getMantissaForPrecision(precision)
    const { mant } = this

    if (precision >= this.prec) {
      // Lossless conversion, ignore rounding mode, simply copy the words
      mantissaOut.set(mant)

      return new BigFloat(this.sign, this.exp, this.prec, mantissaOut)
    } else {
      // Lossy conversion; grab the first "precision" bits of this float, round in the correct direction, create a
      // new float with the same words. We leave things in the words format so that not much annoying bit stuff has to
      // be done

      let expOffset = Math.clz32(mant[0])

      // Copy over all the words. All that remains is determining the rounding. We examine the extra bits and determine
      // whether they are 0, between 0 and 0.5, 0.5, and between 0.5 and 0.75.
      mantissaOut.set(mant.subarray(0, mantissaOut.length))


    }
  }

  /**
   * Clone this big float
   * @returns {BigFloat}
   */
  clone () {
    return new BigFloat(this.sign, this.exp, this.prec, new Int32Array(this.mant))
  }

  toNumber ({ roundingMode = CURRENT_ROUNDING_MODE }) {
    // The strategy isn't too crazy here; we grab the first 53 bits of the mantissa, round in the correct direction
    // according to rounding mode, and get the correct exponent. There
    // is some special annoyance for denormal numbers, but whatever

    const { mant } = this

    // The exponent offset within the words
    let expOffset = Math.clz32(mant[0])
    let mantissaOut = 0

    for (let i = 0; i < mant.length; ++i) {
      let word = mant[i]
    }


    let val = 0
    for (let i = 0; i < this.mant.length; ++i) {
      val += this.mant[i] * (pow2(-30 * (i + 1)))
    }
    return val * pow2(30 * this.exp)
  }

  static zero ({ precision = CURRENT_PRECISION } = {}) {
    return new BigFloat(0, 0, precision, getMantissaForPrecision(precision))
  }

  static NaN ({ precision = CURRENT_PRECISION } = {}) {
    return new BigFloat(NaN, 0, precision, getMantissaForPrecision(precision))
  }

  static Infinity ({ precision = CURRENT_PRECISION } = {}) {
    return new BigFloat(Infinity, 0, precision, getMantissaForPrecision(precision))
  }

  static NegativeInfinity ({ precision = CURRENT_PRECISION } = {}) {
    return new BigFloat(-Infinity, 0, precision, getMantissaForPrecision(precision))
  }

  static isNaN (f) {
    return Number.isNaN(f.sign)
  }

  static isFinite (f) {
    return Number.isFinite(f.sign)
  }

  static isZero (f) {
    return f.sign === 0
  }
}
