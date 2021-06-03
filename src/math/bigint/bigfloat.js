
// A float is of the following form: sign * (2^30)^e * m, where m is a list of 30-bit words that contain the mantissa of
// the float. m = m_1 / 2^30 + m_2 / 2^60 + ... . The precision is the number of bits kept track of in the words. Since
// the start of the significant bits can occur anywhere from 0 to 29 bits into the first word,

import {getExponent, getMantissa, isDenormal, pow2, flrLog2, getExponentAndMantissa} from "../real/fp_manip.js"
import {ROUNDING_MODE} from "../rounding_modes.js"
import {leftZeroPad} from "../../core/utils.js"
import {roundDown} from "../real/fp_manip"

const BIGFLOAT_WORD_BITS = 30
const BIGFLOAT_WORD_SIZE = 1 << BIGFLOAT_WORD_BITS
const BIGFLOAT_WORD_MAX = BIGFLOAT_WORD_SIZE - 1

let CURRENT_PRECISION = 53
let CURRENT_ROUNDING_MODE = ROUNDING_MODE.NEAREST

/**
 * The minimum number of words needed to store a mantissa with prec bits. The +1 is because the bits need to be stored
 * at any shift within the word, from 1 to 29, so some space may be needed
 * @param prec {number}
 * @returns {number}
 */
function neededWordsForPrecision (prec) {
  return Math.ceil((prec - 1) / BIGFLOAT_WORD_BITS + 1)
}

/**
 * Get an empty mantissa able to store a mantissa with prec bits.
 * @param prec
 * @returns {Int32Array}
 */
function createMantissaForPrecision (prec) {
  return new Int32Array(neededWordsForPrecision(prec))
}

/**
 * Round an (unsigned) mantissa to a given precision in place, in one of a few rounding modes. Returns a shift bit if
 * the rounding operation brings the float to a higher exponent, then shifts the mantissa accordingly. A target mantissa
 * may be specified that is modified instead of the first mantissa.
 * @param mantissa {Int32Array} Array of 30-bit mantissa words
 * @param precision {number} Precision, in bits, to round the mantissa to
 * @param roundingMode {number} Rounding mode; the operation treats the number as positive
 * @param targetMantissa {Int32Array} The mantissa that is actually modified by the operation
 * @returns {{shift: (number)}} 1 or 0
 */
export function roundMantissaToPrecisionInPlace (mantissa, precision, roundingMode=CURRENT_ROUNDING_MODE, targetMantissa=mantissa) {
  // "Whatever rounding"; we don't round at all
  if (roundingMode === ROUNDING_MODE.WHATEVER) return { shift: 0 }

  let mantissaLen = mantissa.length
  let targetMantissaLen = targetMantissa.length

  // If we're not modifying the given mantissa, we need to copy over the words first
  if (targetMantissa !== mantissa) {
    targetMantissa.set(mantissa.subarray(0, targetMantissaLen))
  }

  // How many ghost bits there are at the beginning
  let offset = Math.clz32(mantissa[0]) - 2

  // Which BIT to start truncating at, indexing from 0
  let trunc = precision + offset
  let truncWord = Math.floor(trunc / BIGFLOAT_WORD_BITS)

  // If the truncation would happen after the end of the mantissa, do nothing
  if (truncWord >= mantissaLen) return { shift: 0 }

  // Number of bits to truncate off the word, a number between 1 and 30 inclusive
  let truncateLen = BIGFLOAT_WORD_BITS - (trunc - truncWord * BIGFLOAT_WORD_BITS)

  // Truncate the word
  let word = mantissa[truncWord]
  let truncatedWord = (word >> truncateLen) << truncateLen

  targetMantissa[truncWord] = truncatedWord

  // Store the remainder, aka what was just truncated off
  let rem = word - truncatedWord

  // Determine whether to round up instead of truncating. Rounding up entails adding a 1 bit right where the mantissa
  // was truncated. For example, if we just truncated 011010110|1000, and our rounding mode is, say, TIES_AWAY, then we
  // determine that we have to round up and add 1 to the end: 01101011[1]. We call this a carry because it could
  // carry down the word in the right circumstances.
  let doCarry = false
  doCarry: if (roundingMode === ROUNDING_MODE.UP || roundingMode === ROUNDING_MODE.TOWARD_INF) {
    // If we're rounding up, we carry if and only if the remainder is positive or there is a nonzero word after the truncated word
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
    // rest of the limbs are 0, then break the tie
    let splitPoint = 1 << (truncateLen - 1)

    if (rem < splitPoint) break doCarry
    else if (rem > splitPoint) {
      doCarry = true
      break doCarry
    } else for (let i = truncWord + 1; i < mantissaLen; ++i) {
      // Try to break the tie by looking for nonzero bits
      if (mantissa[i] !== 0) {
        doCarry = true
        break doCarry
      }
    }

    // Tie
    if (roundingMode === ROUNDING_MODE.TIES_EVEN) {
      // We only do the carry if it would give an even bit at the end. To do this we query for the bit which will be
      // affected (the truncateLen th bit). If the bit is 1, we do the carry. If truncateLen is 30 then we have to look
      // at the preceding word for the bit, since we truncated *at* a word
      let bit = (truncateLen === BIGFLOAT_WORD_BITS) ?
        (mantissa[truncWord - 1] & 1) :
        ((mantissa[truncWord] >> truncateLen) & 1)

      if (bit) doCarry = true
    } else {
      // Ties away from zero; always carry
      doCarry = true
    }
  }

  // Set all the words following the truncated word to 0
  for (let j = truncWord; ++j < targetMantissaLen; ) {
    targetMantissa[j] = 0
  }

  // The carry value is returned indicating whether the mantissa has "overflowed", in some sense
  let carry = 0

  if (doCarry) {
    // Carry amount. Note that in the case of truncateLen = 30 we add 1 << 30 to a word, then immediately subtract
    // 2^30 and carry it to the next word, so everything works out
    carry = 1 << truncateLen

    for (let j = truncWord; j >= 0; --j) {
      let word = targetMantissa[j] + carry

      if (word > BIGFLOAT_WORD_MAX) {
        word -= BIGFLOAT_WORD_SIZE
        targetMantissa[j] = word
        carry = 1
      } else {
        targetMantissa[j] = word
        carry = 0
        break
      }
    }
  }

  if (carry === 1) {
    // We carried the whole way and still have a 1, meaning the mantissa is now full of zeros. We shift to the right
    // by 30 bits and call it a day
    targetMantissa[0] = 1

    return { shift: 1 }
  }

  return { shift: 0 }
}

/**
 * Right shift a mantissa by shift bits, destroying any bits that trail off the end.
 * @param mantissa {Int32Array}
 * @param shift {number}
 * @returns {Int32Array} Returns the passed mantissa
 */
export function rightShiftMantissaInPlace (mantissa, shift) {
  if (shift === 0) return mantissa

  let mantissaLen = mantissa.length

  let integerShift = Math.floor(shift / 30)
  let bitShift = shift % 30

  if (bitShift === 0) {
    // Since it's a multiple of 30, we just copy everything over
    for (let i = mantissaLen - 1; i >= 0; --i) {
      mantissa[i + integerShift] = mantissa[i]
    }

    // Fill empty stuff with zeros
    for (let i = 0; i < integerShift; ++i) {
      mantissa[i] = 0
    }
  } else {
    let invBitShift = 30 - bitShift
    let firstNeededIndex = mantissaLen - integerShift - 1

    for (let i = firstNeededIndex; i >= 0; --i) {
      let word = mantissa[i]

      // Two components from each word
      if (i !== firstNeededIndex)
        mantissa[i + integerShift + 1] += (word & ((1 << bitShift) - 1)) << invBitShift
      mantissa[i + integerShift] = word >> bitShift
    }

    for (let i = 0; i < integerShift; ++i) mantissa[i] = 0
  }

  return mantissa
}

/**
 * Multiply a mantissa by an integer between 1 and 2^30 - 1, returning a new mantissa and a shift amount. The shift
 * amount is the number of words by which the new mantissa is shifted relative to the first (and is thus either 0 or 1).
 * @param mantissa
 * @param precision
 * @param int
 * @param roundingMode
 * @returns {{shift: number, mantissa: Int32Array}}
 */
function multiplyMantissaByInteger (mantissa, precision, int, roundingMode=CURRENT_ROUNDING_MODE) {
  let newMantissa = createMantissaForPrecision(precision)

  // Decompose the given integer into two 15-bit words for the multiplication
  let word1Lo = int & 0x7FFF
  let word1Hi = int >> 15

  let carry = 0
  for (let i = mantissa.length - 1; i >= 0; --i) {
    // Multiply the word, storing the low part and tracking the high part
    let word = mantissa[i]

    let word2Lo = word & 0x7FFF
    let word2Hi = word >> 15

    let low = Math.imul(word1Lo, word2Lo), high = Math.imul(word1Hi, word2Hi)
    let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi)

    low += ((middle & 0x7FFF) << 15) + carry
    if (low > 0x3FFFFFFF) {
      high += low >> 30
      low &= 0x3FFFFFFF
    }

    high += middle >> 15

    newMantissa[i] = low
    carry = high
  }

  if (carry !== 0) {
    // TODO rounding modes
    let newCarry = 32 - Math.clz32(carry)
    let remainingPrecision = precision - newCarry

    let { carry: roundingCarry } = roundMantissaToPrecisionInPlace()

    rightShiftMantissaInPlace(newMantissa, 30)
    newMantissa[0] = carry

    return { shift: 1, mantissa: newMantissa  }
  }



  return { shift: 0, mantissa: newMantissa }
}

// Another rather important function. In this case the shift is relative to the product of the first two words
export function multiplyMantissas (mant1, mant2, precision, roundingMode=CURRENT_ROUNDING_MODE) {
  let newMantissa = createMantissaForPrecision(precision)
  let arr = []

  // Will definitely optimise later
  for (let i = mant1.length - 1; i >= 0; --i) {
    let mant1Word = mant1[i]
    let mant1WordLo = mant1Word & 0x7FFF
    let mant1WordHi = mant1Word >> 15

    let carry = 0
    for (let j = mant2.length - 1; j >= 0; --j) {
      let mant2Word = mant2[j]
      let mant2WordLo = mant2Word & 0x7FFF
      let mant2WordHi = mant2Word >> 15

      let low = Math.imul(mant1WordLo, mant2WordLo), high = Math.imul(mant1WordHi, mant2WordHi)
      let middle = Math.imul(mant2WordLo, mant1WordHi) + Math.imul(mant1WordLo, mant2WordHi)

      low += ((middle & 0x7FFF) << 15) + carry + arr[i + j]
      low >>>= 0

      if (low > 0x3FFFFFFF) {
        high += low >>> 30
        low &= 0x3FFFFFFF
      }

      high += middle >> 15

      arr[i + j] = low
      carry = high
    }
  }

  return { shift: 0, mantissa: newMantissa }
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

  const mant1Len = mant1.length, mant2Len = mant2.length, mant2End = mant2Len + mant2shift
  let needsCarry = false, carry = 0 /* intermediate carry */, finalCarry = 0 /* carry bit */

  let remainderTraitsHasCarry = false /* true if the remainder carries one bit to the last word*/,
    remainderTraitsAllZeros = true /* true if the remainder is all zeros, after subtracting the carry */,
    remainderTraitsTie = 0 /* 0 if the remainder is less than the tie, 1 if a tie, and 2 if greater */

  // Do the carry on the target mantissa
  function doCarry () {
    for (let j = targetMantLen - 1; j >= 0; --j) {
      let word = targetMant[j] + carry

      if (word > BIGFLOAT_WORD_MAX) {
        word -= BIGFLOAT_WORD_SIZE
        targetMant[j] = word
        carry = 1
      } else {
        targetMant[j] = word
        carry = 0
      }
    }

    finalCarry += carry
  }

  // TODO
  function queryRemainder () {
    let remainder = []
    let bound = Math.max(mant1Len, mant2End)

    for (let i = targetMantLen; i < bound; ++i) {
      let word = ((i < mant1Len) ? mant1[i] : 0) + ((i < mant2End) ? mant2[i - mant2shift] : 0)

      if (i === targetMantLen) {
        if (word === 1 << 29) {
          remainderTraitsTie = 1
        } else if (word > (1 << 29)) {
          remainderTraitsTie = 2
        } else {
          remainderTraitsTie = 0
        }
      }

      if (word === 0) {

      } else {
        if (remainderTraitsTie === 1)
          remainderTraitsTie = 0
      }
    }
  }

  // Copy over mantissa 1
  targetMant.set(mant1.subarray(0, targetMantLen))

  // Compute all the words in the target mantissa
  let mant2Bound = Math.min(mant2End, targetMantLen)
  for (let i = mant2shift; i < mant2Bound; ++i) {
    if ((targetMant[i] += mant2[i]) > BIGFLOAT_WORD_MAX)
      needsCarry = true
  }

  if (needsCarry) doCarry()

  if (targetMant[targetMantLen - 1] < 0x3FFFFFFF) {
    // No possibility of carries from the remainder, so we don't *necessarily* have to compute it

  } else {
    // Need to compute the remainder and see if it has carries

  }

  let offset = Math.clz32(targetMant[0]) - 2

  let trunc = (precision + offset)
  let truncWord = Math.floor(trunc / BIGFLOAT_WORD_BITS)

  // Number of bits to truncate off the word (between 1 and 30)
  let truncateLen = BIGFLOAT_WORD_BITS - (trunc - truncWord * BIGFLOAT_WORD_BITS)

  // In the vast, vast majority of cases, this is all we need.
  if (carry === 1) {
    roundMantissaToPrecisionInPlace(targetMant, precision - 1, roundingMode)
    rightShiftMantissaInPlace(targetMant, 30)

    return { shift: 1 }
  } else {
    roundMantissaToPrecisionInPlace(targetMant, precision, roundingMode)
    return { shift: 0 }
  }
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
      return new BigFloat(num + 0, 0, precision, createMantissaForPrecision(precision))
    }

    // In the odd case we want a lower precision, we create a normal precision and then downcast
    if (precision < 53) return BigFloat.fromNumber(num, { precision: 53, roundingMode }).toBigFloat({ precision })

    const outMantissa = createMantissaForPrecision(precision)

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
    const mantissaOut = createMantissaForPrecision(precision)
    let { mant, sign, exp, prec } = this

    if (precision >= prec) {
      // Lossless conversion, ignore rounding mode, simply copy the words
      mantissaOut.set(mant)
    } else if (this.sign !== 0 && Number.isFinite(sign)) {
      let flags = roundMantissaToPrecisionInPlace(mant, precision, roundingMode, mantissaOut)
      if (flags.shift !== 0) {
        exp += flags.shift
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

  /**
   * Multiply by an integer in place, which can be done in a fairly optimized way
   * @param num {number}
   */
  multiplyByIntegerInPlace (num, { roundingMode = CURRENT_ROUNDING_MODE } = {}) {
    if (num === 0) {
      this.setZero()
      return this
    } else if (num === 1) {
      return this
    } else if (num === -1) {
      this.sign *= -1
      return this
    }

    let sign = Math.sign(num)
    num *= sign
    if (num > BIGFLOAT_WORD_MAX) throw new RangeError("dum dum")

    const { mant, prec } = this
    const { shift, mantissa } = multiplyMantissaByInteger(mant, prec, num, roundingMode)

    this.mant = mantissa
    this.exp += shift

    return this
  }

  static add (f1, f2, { precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE } = {}) {
    if (f1.exp < f2.exp) {
      [ f1, f2 ] = [f2, f1]
    }

    let mant = createMantissaForPrecision(precision)
    let flags = addMantissas(f1.mant, f2.mant, f2.exp - f1.exp, precision, mant)

    return new BigFloat(f1.sign, f1.exp + flags.shift, precision, mant)
  }

  static zero ({ precision = CURRENT_PRECISION } = {}) {
    return new BigFloat(0, 0, precision, createMantissaForPrecision(precision))
  }

  static NaN ({ precision = CURRENT_PRECISION } = {}) {
    return new BigFloat(NaN, 0, precision, createMantissaForPrecision(precision))
  }

  static Infinity ({ precision = CURRENT_PRECISION } = {}) {
    return new BigFloat(Infinity, 0, precision, createMantissaForPrecision(precision))
  }

  static NegativeInfinity ({ precision = CURRENT_PRECISION } = {}) {
    return new BigFloat(-Infinity, 0, precision, createMantissaForPrecision(precision))
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

  setZero () {
    this.setFromFloat(BigFloat.zero({ precision: this.prec }))
  }

  setFromFloat (f) {
    this.sign = f.sign
    this.exp = f.exp
    this.mant = new Int32Array(f.mant)
    this.prec = f.prec
  }

  toUnderstandableString () {
    return prettyPrintFloat(this.mant, this.prec)
  }
}
