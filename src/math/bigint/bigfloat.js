
// A float is of the following form: sign * (2^30)^e * m, where m is a list of 30-bit words that contain the mantissa of
// the float. m = m_1 / 2^30 + m_2 / 2^60 + ... . The precision is the number of bits kept track of in the words. Since
// the start of the significant bits can occur anywhere from 0 to 29 bits into the first word,

import {getExponent, getMantissa, isDenormal, pow2, flrLog2, getExponentAndMantissa} from "../real/fp_manip.js"
import {ROUNDING_MODE} from "../rounding_modes.js"
import {leftZeroPad} from "../../core/utils.js"

const BIGFLOAT_WORD_BITS = 30
const BIGFLOAT_WORD_SIZE = 1 << BIGFLOAT_WORD_BITS
const BIGFLOAT_WORD_MAX = BIGFLOAT_WORD_SIZE - 1

let CURRENT_PRECISION = 53
let CURRENT_ROUNDING_MODE = ROUNDING_MODE.NEAREST

let FLAGS = {
  EXACT: false
}

function neededWordsForPrecision (prec) {
  return Math.ceil((prec - 1) / BIGFLOAT_WORD_BITS + 1)
}

function getMantissaForPrecision (prec) {
  return new Int32Array(neededWordsForPrecision(prec))
}

/**
 * Round an (unsigned) mantissa to a given precision in place, in one of a few rounding modes. Returns a carry bit if
 * the rounding operation brings the float to a higher exponent.
 * @param mantissa {Int32Array} Array of 30-bit mantissa words
 * @param prec {number} Precision, in bits, to round the mantissa to
 * @param roundingMode {number} Rounding mode; the operation treats the number as positive
 * @param targetMantissa {Int32Array} The mantissa that is actually modified by the operation
 * @returns {{carry: (number), exact: (number)}} Carry bit; if the rounding operation leads to a carry, return 1, else return 0. Exact; whether the operation lost no precision.
 */
export function roundMantissaToPrecisionInPlace (mantissa, prec, roundingMode=CURRENT_ROUNDING_MODE, targetMantissa=mantissa) {
  let mantissaLen = mantissa.length
  let targetMantissaLen = targetMantissa.length

  // If we're not modifying the given mantissa, we need to copy over the words first
  if (targetMantissa !== mantissa) {
    targetMantissa.set(mantissa.subarray(0, targetMantissaLen))
  }

  // How many ghost bits there are at the beginning
  let offset = Math.clz32(mantissa[0]) - 2

  // Which BIT to start truncating at, indexing from 0
  let trunc = (prec + offset)
  let truncWord = Math.floor(trunc / BIGFLOAT_WORD_BITS)
  if (truncWord >= mantissaLen) return { carry: 0, exact: 1 }

  // Number of bits to truncate off the word
  let truncateLen = BIGFLOAT_WORD_BITS - (trunc - truncWord * BIGFLOAT_WORD_BITS)

  let doCarry = false

  let word = mantissa[truncWord]
  let truncatedWord = (word >> truncateLen) << truncateLen

  targetMantissa[truncWord] = truncatedWord
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
  } else if (roundingMode === ROUNDING_MODE.NEAREST || roundingMode === ROUNDING_MODE.TIES_AWAY) {
    // Truncated amounts less than this mean round down; more means round up; equals means needs to check whether the
    // rest of the limbs are 0
    let splitPoint = 1 << (truncateLen - 1)

    if (rem < splitPoint) break doCarry
    else if (rem > splitPoint) {
      doCarry = true
      break doCarry
    } else for (let i = truncWord + 1; i < mantissaLen; ++i) {
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

  // Fill the remaining words and if any are nonzero, set isExact to 0
  let isExact = +(rem === 0) && !doCarry
  for (let j = truncWord; ++j < targetMantissaLen; ) {
    if (targetMantissa[j] !== 0) isExact = 0

    targetMantissa[j] = 0
  }

  let carry = 0
  if (doCarry) {
    // Carry amount. Note that in the case of truncateLen = 30 we'll add 1 << 30 to a word, then immediately carry it
    // to the next word, so everything works out correctly
    carry = 1 << truncateLen

    for (let j = truncWord; j >= 0; --j) {
      let word = targetMantissa[j] + carry

      if (word > BIGFLOAT_WORD_MAX) {
        word -= BIGFLOAT_WORD_SIZE
        carry = 1
        targetMantissa[j] = word
      } else {
        targetMantissa[j] = word
        carry = 0
        break
      }
    }
  }

  return { carry, exact: isExact }
}

/**
 * Add two mantissas together, potentially with an integer word shift on the second mantissa, and write the result to
 * mant1. There may be a carry, in which case the target mantissa will be correct and usable, but the exponent must be
 * adjusted, which is reflected in the shift flag returned by this function.
 * @param mant1 {Int32Array}
 * @param mant2 {Int32Array}
 * @param mant2shift {number}
 * @param precision {number}
 * @param targetMant {Int32Array}
 * @param roundingMode {number}
 */
export function addMantissas (mant1, mant2, mant2shift, precision, targetMant, roundingMode=CURRENT_ROUNDING_MODE) {
  // We index words from mant1[0] being the 0th.
  let targetMantLen = targetMant.length

  let fullCarryPossible = true
  for (let i = 0; i < targetMantLen; ++i) {
    let word = ((i < mant1.length) ? mant1[i] : 0) + ((i >= mant2shift && i < mant2.length) ? mant2[i - mant2shift] : 0)

    targetMant[i] = word

    if (word < BIGFLOAT_WORD_MAX)
      fullCarryPossible = false
  }

  //roundMantissaToPrecisionInPlace(targetMant, precision, roundingMode)
}

/**
 * Right shift a mantissa by shift bits. Instead of modifying the given mantissa, a target may be given which will be
 * modified instead.
 * @param mantissa
 * @param shift
 * @param targetMantissa
 * @returns {*}
 */
export function rightShiftMantissaInPlace (mantissa, shift, targetMantissa=mantissa) {
  if (shift === 0) {
    if (targetMantissa !== mantissa)
      targetMantissa.set(mantissa.subarray(0, targetMantissa.length))
    return targetMantissa
  }

  let mantissaLen = mantissa.length
  let targetMantissaLen = targetMantissa.length

  let integerShift = Math.floor(shift / 30)
  let bitShift = shift % 30

  if (bitShift === 0) {
    // Since it's a multiple of 30, we just shift everything over
    for (let i = 0; i < mantissaLen; ++i) {
      targetMantissa[i + integerShift] = mantissa[i]
    }

    for (let i = 0; i < integerShift; ++i) {
      targetMantissa[i] = 0
    }
  } else {
    let invBitShift = 30 - bitShift
    let firstNeededIndex = Math.min(mantissaLen - 1, targetMantissaLen - integerShift - 1)

    for (let i = firstNeededIndex; i >= 0; --i) {
      let word = mantissa[i]

      if (i !== firstNeededIndex)
        targetMantissa[i + integerShift + 1] += (word & ((1 << bitShift) - 1)) << invBitShift
      targetMantissa[i + integerShift] = word >> bitShift
    }

    for (let i = 0; i < integerShift; ++i) {
      targetMantissa[i] = 0
    }
  }

  return targetMantissa
}

export function prettyPrintFloat (mantissa, precision) {
  let words = []
  let indices = []

  for (let i = 0; i < mantissa.length; ++i) {
    words.push(leftZeroPad(mantissa[i].toString(2), BIGFLOAT_WORD_BITS, '0'))
    indices.push("0    5    10   15   20   25   ")
  }

  function insert (index, wordChar, indicesChar) {
    let wordIndex = Math.floor(index / BIGFLOAT_WORD_BITS)
    let subIndex = index - wordIndex * BIGFLOAT_WORD_BITS

    let wordWord = words[wordIndex]
    let indicesWord = indices[wordIndex]

    words[wordIndex] = wordWord.slice(0, subIndex) + wordChar + wordWord.slice(subIndex)
    indices[wordIndex] = indicesWord.slice(0, subIndex) + indicesChar + indicesWord.slice(subIndex)
  }

  // Insert [ ... ] surrounding the actual meaningful parts of the mantissa
  if (precision) {
    let offset = Math.clz32(mantissa[0]) - 2

    let startIndex = offset
    let endIndex = offset + precision

    insert(startIndex, '[', ' ')
    insert(endIndex, ']', ' ')
  }

  words = words.join(' | ')
  indices = indices.join(' | ')

  return words + '\n' + indices
}

export class BigFloat {
  constructor (sign, exponent, precision, mantissa) {
    this.sign = sign
    this.exp = exponent
    this.prec = precision
    this.mant = mantissa
  }

  /**
   * Construct a new BigFloat from a JS number with a given precision and rounding in the correct direction if the
   * precision is less than 53.
   * @param num {number}
   * @param precision {number}
   * @param roundingMode {number}
   * @returns {BigFloat}
   */
  static fromNumber (num, { precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE } = {}) {
    if (num === 0 || !Number.isFinite(num)) {
      return new BigFloat(num + 0, 0, precision, getMantissaForPrecision(precision))
    }

    // In the odd case we want a lower precision, we create a normal precision and then downcast
    if (precision < 53) return BigFloat.fromNumber(num, { precision: 53, roundingMode }).toBigFloat({ precision })

    const outMantissa = getMantissaForPrecision(precision)

    let isNumDenormal = isDenormal(num)
    let [ valExponent, valMantissa ] = getExponentAndMantissa(num)

    // Exponent of the float (2^30)^newExp
    let newExp = Math.ceil((valExponent + 1) / BIGFLOAT_WORD_BITS)

    // The mantissa needs to be shifted to the right by this much. 0 < bitshift <= 30. If the number is denormal, we
    // have to shift it by one bit less
    let bitshift = newExp * BIGFLOAT_WORD_BITS - valExponent - isNumDenormal

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

    return new BigFloat(Math.sign(num) + 0, newExp, precision, outMantissa)
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
    let { mant, sign, exp, prec } = this

    if (precision >= prec) {
      // Lossless conversion, ignore rounding mode, simply copy the words
      mantissaOut.set(mant)
    } else if (this.sign !== 0 && Number.isFinite(sign)) {
      let flags = roundMantissaToPrecisionInPlace(mant, precision, roundingMode, mantissaOut)
      if (flags.carry !== 0) {
        // Pain; we need to shift the whole mantissa 30 bits to the right and increase the (power of 2^30) exponent by
        // 1. Not too difficult, but annoying. In this case, because it's the output of a ROUND, the entire mantissa is
        // guaranteed to be 0, so we just create a new mantissa with a single word of 1.

        exp += 1
        mantissaOut[0] = 1
      }
    }

    return new BigFloat(sign, exp, precision, mantissaOut)
  }

  /**
   * Clone this big float
   * @returns {BigFloat}
   */
  clone () {
    return new BigFloat(this.sign, this.exp, this.prec, new Int32Array(this.mant))
  }

  /**
   * Convert this BigFloat to a normal JS number, rounding in the given direction and optionally rounding to the nearest
   * float32 value. It *does* handle denormal numbers, unfortunately for me.
   * @param roundingMode {number}
   * @param f32 {boolean}
   * @returns {number}
   */
  toNumber ({ roundingMode = CURRENT_ROUNDING_MODE, f32 = false } = {}) {
    // Special numbers
    if (this.sign === 0 || !Number.isFinite(this.sign)) return this.sign

    const outMantissa = new Int32Array(3)
    const flags = roundMantissaToPrecisionInPlace(this.mant, f32 ? 24 : 53, roundingMode, outMantissa)

    let exponent = (this.exp - 1) * BIGFLOAT_WORD_BITS, mant

    if (flags.carry) {
      mant = 1 << 30
    } else {
      mant = outMantissa[0] + outMantissa[1] * pow2(-BIGFLOAT_WORD_BITS) + outMantissa[2] * pow2(-2 * BIGFLOAT_WORD_BITS)
    }

    // The number in question is now mant * 2 ^ exponent, where 1 <= mant <= 2^30 and exponent is any number. We now
    // normalize the mantissa to be in the range [0.5, 1), which lines up exactly with a normal double
    let expShift = flrLog2(mant) + 1
    mant /= pow2(expShift)
    exponent += expShift

    let MIN_EXPONENT = f32 ? -148 : -1073
    let MAX_EXPONENT = f32 ? 127 : 1023
    let MIN_VALUE = f32 ? 1.175494e-38 : Number.MIN_VALUE
    let MAX_VALUE = f32 ? 3.40282347e+38 : Number.MAX_VALUE

    // We now do various things depending on the rounding mode. The range of a double's exponent is -1024 to 1023,
    // inclusive, so if the exponent is outside of those bounds, we clamp it to a value depending on the rounding mode.
    if (exponent < MIN_EXPONENT) {
      if (roundingMode === ROUNDING_MODE.TIES_AWAY || roundingMode === ROUNDING_MODE.NEAREST) {
        // Debating between 0 and Number.MIN_VALUE. Unfortunately at 0.5 * 2^1074 there is a TIE, so we detect that case
        // separately PAINNNN

        if (exponent === MIN_EXPONENT - 1) {
          // If greater or ties away
          if (mant > 0.5 || (roundingMode === ROUNDING_MODE.TIES_AWAY)) {
            return this.sign * MIN_VALUE
          }
        }

        return 0
      } else {
        if (this.sign === 1) {
          if (roundingMode === ROUNDING_MODE.TOWARD_INF || roundingMode === ROUNDING_MODE.UP) return MIN_VALUE
          else return 0
        } else {
          if (roundingMode === ROUNDING_MODE.TOWARD_ZERO || roundingMode === ROUNDING_MODE.UP) return 0
          else return -MIN_VALUE
        }
      }
    } else if (exponent > MAX_EXPONENT) {
      if (exponent === MAX_EXPONENT + 1) { // Bottom formula will overflow, so we adjust
        return this.sign * mant * 2 * pow2(exponent - 1)
      }

      if (roundingMode === ROUNDING_MODE.TIES_AWAY || roundingMode === ROUNDING_MODE.NEAREST) {
        return Infinity * this.sign
      } else if (this.sign === 1) {
        if (roundingMode === ROUNDING_MODE.TOWARD_INF || roundingMode === ROUNDING_MODE.UP) return Infinity
        else return MAX_VALUE
      } else {
        if (roundingMode === ROUNDING_MODE.TOWARD_ZERO || roundingMode === ROUNDING_MODE.UP) return -MAX_VALUE
        else return -Infinity
      }
    } else {
      return this.sign * mant * pow2(exponent)
    }
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

  toUnderstandableString () {
    return prettyPrintFloat(this.mant, this.prec)
  }
}
