
// A float is of the following form: sign * (2^30)^e * m, where m is a list of 30-bit words that contain the mantissa of
// the float. m = m_1 / 2^30 + m_2 / 2^60 + ... . The precision is the number of bits kept track of in the words. Since
// the start of the significant bits can occur anywhere from 0 to 29 bits into the first word,

import {flrLog2, getExponentAndMantissa, isDenormal, pow2} from "../real/fp_manip.js"
import {ROUNDING_MODE} from "../rounding_modes.js"
import {leftZeroPad} from "../../core/utils.js"

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
  return ((prec - 1) / BIGFLOAT_WORD_BITS + 2) | 0
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
 * Given a subarray of a mantissa, return 0 if infinite zeros; 1 if between 0 and 0.5; 2 if a tie; 3 if between a tie and 1
 * @param mantissa {Int32Array}
 * @param index {number}
 * @returns {number}
 */
function getTrailingInfo (mantissa, index) {
  if (mantissa[index] === 1 << 29) {
    for (let i = index+1; i < mantissa.length; ++i) {
      if (mantissa[i] !== 0) return 3
    }
    return 2
  }

  for (let i = index; i < mantissa.length; ++i) {
    if (mantissa[i] !== 0) return 1
  }

  return 0
}

export function setGlobalRoundingMode (roundingMode) {
  CURRENT_ROUNDING_MODE = roundingMode
}

export function setGlobalPrecision (precision) {
  CURRENT_PRECISION = precision
}

/**
 * Round an (unsigned) mantissa to a given precision, in one of a few rounding modes. Also returns a shift if the
 * rounding operation brings the float to a higher exponent. Trailing information may be provided about the digits
 * following the mantissa to ensure correct rounding in those cases. This function allows aliasing, meaning the target
 * mantissa and the given mantissa can be the same array, leading to an in-place operation
 * @param mantissa {Int32Array} Array of 30-bit mantissa words
 * @param precision {number} Precision, in bits, to round the mantissa to
 * @param targetMantissa {Int32Array} The mantissa to write to
 * @param roundingMode {number} Rounding mode; the operation treats the number as positive
 * @param trailingInfo {number} 0 if the mantissa is followed by infinite zeros; 1 if between 0 and 0.5; 2 if a tie; 3 if between a tie and 1
 * @param trailingInfoMode {number} 0 if the trailingInfo is considered to be at the end of all the words; 1 if it's considered to be at the end of precision
 * @returns {number} The shift of the rounding operation; 1 or 0
 */
export function roundMantissaToPrecision (mantissa, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE, trailingInfo=0, trailingInfoMode=0) {
  let isAliased = mantissa === targetMantissa

  if (roundingMode === ROUNDING_MODE.WHATEVER) {
    if (isAliased) return 0

    // Copy over the mantissa without rounding
    for (let i = targetMantissa.length - 1; i > 0; --i) {
      targetMantissa[i] = mantissa[i]
    }

    return 0
  }

  // Create a mantissa, which may or may not be longer than the given mantissa
  let targetMantissaLen = targetMantissa.length
  let mantissaLen = mantissa.length

  // Copy over the given mantissa
  if (!isAliased) {
    for (let i = 0; i < targetMantissaLen; ++i) {
      targetMantissa[i] = mantissa[i]
    }
  }

  // How many ghost bits there are at the beginning; in other words, where to start counting precision bits from
  let offset = Math.clz32(mantissa[0]) - 2

  // Which bit to start truncating at, indexing from 0 = the beginning of the mantissa
  let trunc = precision + offset
  let truncWord = (trunc / BIGFLOAT_WORD_BITS) | 0

  // Number of bits to truncate off the word, a number between 1 and 30 inclusive
  let truncateLen = BIGFLOAT_WORD_BITS - (trunc - truncWord * BIGFLOAT_WORD_BITS)

  // Remainder of the truncation and whether to do a carry after the truncation (rounding up)
  let rem = 0, doCarry = false

  // If the truncation would happen after the end of the mantissa...
  if (truncWord >= targetMantissaLen) {
    // Whether the truncation bit is on the (nonexistent) word right after the mantissa
    let isAtVeryEnd = truncWord === targetMantissaLen && truncateLen === BIGFLOAT_WORD_BITS

    // Fake a trailing info after the end. Our general strategy with trailingInfoMode = 1 is to convert it into a form
    // that trailingInfoMode = 0 can handle
    if (!isAtVeryEnd && trailingInfoMode === 1 && trailingInfo > 0) {
      // Any positive trailing info that isn't at the very end turns into a trailing info between 0 and 0.5 at the end
      trailingInfo = 1
      isAtVeryEnd = true
    }

    // If rounding at the very end, what we do depends directly on the trailingInfo. To avoid complicating matters, we
    // "fake" the tie and round up cases so that the code doesn't have to be duplicated--especially the tie code, which
    // is slightly intricate
    if (isAtVeryEnd) {
      if (trailingInfo === 0 || (roundingMode === ROUNDING_MODE.DOWN || roundingMode === ROUNDING_MODE.TOWARD_ZERO) ||
        ((trailingInfo === 1) && (roundingMode === ROUNDING_MODE.TIES_AWAY || roundingMode === ROUNDING_MODE.TOWARD_ZERO))) {
        return 0
      } else if (trailingInfo === 2 && (roundingMode === ROUNDING_MODE.TIES_AWAY || roundingMode === ROUNDING_MODE.TOWARD_ZERO)) {
        rem = 0x20000000 // emulate tie = BIGFLOAT_WORD_SIZE / 2
      } else {
        rem = 0x30000000 // emulate round up = 3 * BIGFLOAT_WORD_SIZE / 4
      }
    } else {
      // Otherwise, if the rounding is happening after the very end, nothing happens since it's already all 0s
      return 0
    }
  } else {
    // Truncate the word
    let word = targetMantissa[truncWord]
    let truncatedWord = (word >> truncateLen) << truncateLen
    targetMantissa[truncWord] = truncatedWord

    // Store the remainder, aka what was just truncated off
    if (trailingInfoMode === 0) {
      rem = word - truncatedWord
    } else {
      // When in info mode 1, we fake a remainder and trailing info that corresponds to the correct rounding mode.
      // 0 -> (0, 0), 1 (between 0 and 0.5) -> (0, positive), 2 -> (tie, 0), 3 -> (tie, (between 0 and 0.5))
      rem = (trailingInfo < 2) ? 0 : (1 << (truncateLen - 1))
      trailingInfo &= 1
    }
  }

  // Determine whether to round up instead of truncating. Rounding up entails adding a 1 bit right where the mantissa
  // was truncated. For example, if we just truncated 011010110|1000, and our rounding mode is, say, TIES_AWAY, then we
  // determine that we have to round up and add 1 to the end: 01101011[1]. We call this a carry because it could
  // carry down the word in the right circumstances.
  doCarry: if (roundingMode === ROUNDING_MODE.UP || roundingMode === ROUNDING_MODE.TOWARD_INF) {
    // If we're rounding up, we carry if and only if the remainder is positive or there is a nonzero word after the
    // truncated word. If in info mode 1 we treat all the numbers following as 0 anyway, since that information is
    // contained within rem and trailingInfo
    if (rem > 0 || trailingInfo > 0) {
      doCarry = true
    } else if (trailingInfoMode === 0) {
      for (let i = truncWord + 1; i < mantissaLen; ++i) {
        if (mantissa[i] !== 0) {
          doCarry = true
          break
        }
      }
    }
  } else if (roundingMode === ROUNDING_MODE.NEAREST || roundingMode === ROUNDING_MODE.TIES_AWAY) {
    // Truncated amounts less than this mean round down; more means round up; equals means needs to check whether the
    // rest of the limbs are 0, then break the tie
    let splitPoint = 1 << (truncateLen - 1)

    if (rem > splitPoint) {
      doCarry = true
    } else if (rem === splitPoint) {
      if (trailingInfo > 0) {
        doCarry = true
      } else {
        if (trailingInfoMode === 0) {
          // Try to break the tie by looking for nonzero bits
          for (let i = truncWord + 1; i < mantissaLen; ++i) {
            if (mantissa[i] !== 0) {
              doCarry = true
              break doCarry
            }
          }
        }

        // Need to break the tie
        if (roundingMode === ROUNDING_MODE.TIES_EVEN) {
          // We only do the carry if it would give an even bit at the end. To do this we query for the bit which will be
          // affected (the truncateLen th bit). If the bit is 1, we do the carry. If truncateLen is 30 then we have to look
          // at the preceding word for the bit, since we truncated *at* a word
          let bit = (truncateLen === BIGFLOAT_WORD_BITS) ?
            (targetMantissa[truncWord - 1] & 1) :
            ((targetMantissa[truncWord] >> truncateLen) & 1)

          if (bit) doCarry = true
        } else {
          // Ties away from zero; always carry
          doCarry = true
        }
      }
    }
  }

  // Set all the words following the truncated word to 0
  for (let j = truncWord; ++j < targetMantissaLen;) {
    targetMantissa[j] = 0
  }

  // The carry value is returned indicating whether the mantissa has "overflowed" due to rounding
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
        break // can immediately break
      }
    }
  }

  if (carry === 1) {
    // We carried the whole way and still have a 1, meaning the mantissa is now full of zeros and we need to shift by
    // one word and set the first word to a 1
    targetMantissa[0] = 1

    return 1
  }

  return 0
}

/**
 * Add two mantissas together, potentially with an integer word shift on the second mantissa. The result mantissa may
 * also have a shift applied to it, which is relative to mant1. This function seems like it would be relatively simple,
 * but the shifting brings annoyingness, especially with the rounding modes. The overall concept is we compute as much
 * of the addition as needed without doing any carrying, then when we get to the end of the area of needed precision,
 * we continue computing until we can determine with certainty the carry and the rounding direction. This function
 * allows aliasing mant1 to be the target mantissa. TODO optimize
 * @param mant1 {Int32Array}
 * @param mant2 {Int32Array} Nonnegative shift applied to mantissa 2
 * @param mant2Shift {number}
 * @param precision {number}
 * @param targetMantissa {Int32Array} The mantissa that is written to
 * @param roundingMode {number}
 */
export function addMantissas (mant1, mant2, mant2Shift, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  let isAliased = mant1 === targetMantissa

  let mant1Len = mant1.length, mant2Len = mant2.length, mant2End = mant2Len + mant2Shift

  let newMantissaLen = targetMantissa.length
  let newMantissa = targetMantissa

  // Need to compute to higher precision first
  if (mant1Len > newMantissaLen) {
    newMantissaLen = Math.max(mant1Len, neededWordsForPrecision(precision))
    newMantissa = new Int32Array(newMantissaLen)
  }

  // We first sum all the parts of the addition we definitely need:
  if (!isAliased) {
    for (let i = 0; i < mant1Len; ++i) {
      newMantissa[i] = mant1[i]
    }
  }

  let mant2Bound1 = Math.min(mant2End, newMantissaLen)
  for (let i = mant2Shift; i < mant2Bound1; ++i) {
    newMantissa[i] += mant2[i - mant2Shift]
  }

  // Do the carry
  let carry = 0
  for (let i = mant1Len - 1; i >= 0; --i) {
    let word = newMantissa[i] + carry

    if (word > 0x3fffffff) {
      word -= 0x40000000
      newMantissa[i] = word
      carry = 1
    } else {
      newMantissa[i] = word
      carry = 0
    }
  }

  // All that remains are the words of mant2 to the right of mant1Len - mant2Shift
  let trailingInfo = 0
  if (roundingMode === ROUNDING_MODE.TIES_AWAY || roundingMode === ROUNDING_MODE.UP || roundingMode === ROUNDING_MODE.TOWARD_INF || roundingMode === ROUNDING_MODE.NEAREST) {
    let trailingShift = mant1Len - mant2Shift
    trailingInfo = getTrailingInfo(mant2, Math.max(trailingShift, 0))

    if (trailingShift < 0) trailingInfo = +(!!trailingInfo) // Lol, if the trailing info is shifted, then round it to 0 or 1 as appropriate
  }

  let shift = 0

  if (carry) {
    rightShiftMantissaInPlace(newMantissa, 30)
    newMantissa[0] = 1
    shift += 1
  }

  const roundingShift = roundMantissaToPrecision(newMantissa, precision, targetMantissa, roundingMode, trailingInfo)

  return roundingShift + shift
}


/**
 * Subtract two (positive) mantissas, with mant1 > mant2 and mant2 under a given shift, returning a shift relative to
 * the first word of mantissa 1 depending on the result. TODO implement very correct rounding
 * @param mant1 {Int32Array}
 * @param mant2 {Int32Array}
 * @param mant2Shift {number}
 * @param precision {number}
 * @param targetMantissa {Int32Array} The mantissa to write to
 * @param roundingMode {number}
 */
export function subtractMantissas (mant1, mant2, mant2Shift, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  let mant1Len = mant1.length, mant2Len = mant2.length, mant2End = mant2Len + mant2Shift

  // This function is slightly tricky, but not too bad. The main question is how much stuff cancels out before the
  // actual mantissa starts. Since we're guaranteed mant1 > mant2 the question is a bit easier to answer; we step along
  // the words of mant1 until we get to a word of mant1 which is strictly greater than that of mant2. Then, we repeatedly
  // subtract the words of mant2 from mant1, do the full carry, then examine the "negative carry" from the trailing
  // words of mant2; this is essentially subtracting one, then calling roundMantissaToPrecision with a flipped trailing
  // value. In the case of round whatever and round up, this rounding step is skipped.

  // Index of the first word which is different
  let subtractionShift = 0

  findShift: if (mant2Shift === 0) {
    // Figure out where the subtraction starts
    for (let i = 0; i < mant1Len; ++i) {
      let mant1Word = mant1[i]
      let mant2Index = i - mant2Shift
      let mant2Word = (0 <= mant2Index && mant2Index < mant2Len) ? mant2[mant2Index] : 0

      if (mant1Word > mant2Word) {
        subtractionShift = i
        break findShift
      }
    }
  }

  let newMantissa = targetMantissa
  let newMantissaLen = newMantissa.length

  if (newMantissaLen < mant1Len - subtractionShift) {
    newMantissaLen = Math.max(neededWordsForPrecision(precision), mant1Len - subtractionShift)
    newMantissa = new Int32Array(newMantissaLen)
  }

  for (let i = subtractionShift; i < mant1Len; ++i) {
    newMantissa[i - subtractionShift] = mant1[i]
  }

  // Indexing over words where 0 = first word of mant1
  let mant2Bound = Math.min(mant2End, newMantissaLen + subtractionShift)
  for (let i = mant2Shift; i < mant2Bound; ++i) {
    newMantissa[i - subtractionShift] -= mant2[i - mant2Shift]
  }

  let carry = 0
  for (let i = newMantissaLen - 1; i >= 0; --i) {
    let word = newMantissa[i] - carry

    if (word < 0) {
      word += BIGFLOAT_WORD_SIZE
      newMantissa[i] = word
      carry = 1
    } else {
      newMantissa[i] = word
      carry = 0
    }
  }

  let shift = 0
  if (newMantissa[0] === 0) {
    leftShiftMantissaInPlace(newMantissa, 30)
    shift -= 1
  }

  const roundingShift = roundMantissaToPrecision(newMantissa, precision, targetMantissa, roundingMode)

  return shift + roundingShift - subtractionShift
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

  let integerShift = (shift / 30) | 0
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
 * Left shift a mantissa by shift bits, destroying any bits that come off the front.
 * @param mantissa {Int32Array}
 * @param shift {number}
 * @returns {Int32Array} Returns the passed mantissa
 */
export function leftShiftMantissaInPlace (mantissa, shift) {
  if (shift === 0) return mantissa

  let mantissaLen = mantissa.length

  let integerShift = Math.floor(shift / 30)
  let bitShift = shift % 30

  if (bitShift === 0) {
    // Since it's a multiple of 30, we just copy everything over
    for (let i = integerShift; i < mantissa.length; ++i) {
      mantissa[i - integerShift] = mantissa[i]
    }

    // Fill empty stuff with zeros
    for (let i = mantissa.length - integerShift; i < mantissa.length; ++i) {
      mantissa[i] = 0
    }
  } else {
    let invBitShift = 30 - bitShift
    let mantissaLength = mantissa.length

    for (let i = integerShift; i < mantissaLength; ++i) {
      mantissa[i - integerShift] = ((mantissa[i] << bitShift) & 0x3fffffff) + ((i < mantissaLength - 1) ? (mantissa[i + 1] >> invBitShift) : 0)
    }

    for (let i = mantissaLength - integerShift; i < mantissaLength; ++i) {
      mantissa[i] = 0
    }
  }

  return mantissa
}

/**
 * Multiply a mantissa by an integer between 1 and 2^30 - 1, returning a new mantissa and a shift amount. The shift
 * amount is the number of words by which the new mantissa is shifted relative to the first (and is thus either 0 or 1).
 * @param mantissa
 * @param precision
 * @param int
 * @param targetMantissa
 * @param roundingMode
 * @returns {{shift: number, mantissa: Int32Array}}
 */
export function multiplyMantissaByInteger (mantissa, int, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  let newMantissa = new Int32Array(neededWordsForPrecision(precision) + 1) // extra word for overflow

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

    newMantissa[i + 1] = low
    carry = high
  }

  newMantissa[0] = carry
  let shift = 1

  if (carry === 0) {
    // Shift left; there was no carry after all
    for (let i = 0; i < newMantissa.length - 1; ++i) {
      newMantissa[i] = newMantissa[i + 1]
    }

    newMantissa[newMantissa.length - 1] = 0
    shift -= 1
  }

  let roundingShift = roundMantissaToPrecision(newMantissa, precision, targetMantissa, roundingMode)

  return shift + roundingShift
}

/**
 * Multiply two mantissas TODO make more efficient
 * @param mant1
 * @param mant2
 * @param precision
 * @param targetMantissa
 * @param roundingMode
 * @returns {{shift: number, mantissa: Int32Array}}
 */
export function multiplyMantissas (mant1, mant2, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  let arr = new Int32Array(mant1.length + mant2.length + 1)
  let targetMantissaLen = targetMantissa.length

  // Will definitely optimise later
  for (let i = mant1.length; i >= 0; --i) {
    let mant1Word = mant1[i]
    let mant1WordLo = mant1Word & 0x7FFF
    let mant1WordHi = mant1Word >> 15

    let carry = 0, j = mant2.length - 1
    for (; j >= 0; --j) {
      let mant2Word = mant2[j]
      let mant2WordLo = mant2Word & 0x7FFF
      let mant2WordHi = mant2Word >> 15

      let low = Math.imul(mant1WordLo, mant2WordLo), high = Math.imul(mant1WordHi, mant2WordHi)
      let middle = Math.imul(mant2WordLo, mant1WordHi) + Math.imul(mant1WordLo, mant2WordHi)

      low += ((middle & 0x7FFF) << 15) + carry + arr[i + j + 1]
      low >>>= 0

      if (low > 0x3FFFFFFF) {
        high += low >>> 30
        low &= 0x3FFFFFFF
      }

      high += middle >> 15

      arr[i + j + 1] = low
      carry = high
    }

    arr[i] += carry
  }

  let shift = 0

  if (arr[0] === 0) {
    leftShiftMantissaInPlace(arr, 30)
    shift -= 1
  }

  shift += roundMantissaToPrecision(arr, precision, targetMantissa, roundingMode)

  return shift
}

export function sqrtMantissa (mantissa, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  // We proceed by estimating the square root, then do a root finding search basically
}

export function multiplyMantissas2 (mant1, mant2, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  let mant1Len = mant1.length, mant2Len = mant2.length
  let targetMantissaLen = targetMantissa.length

  let highestWord = 0
  for (let i = Math.min(targetMantissaLen, mant1Len - 1); i >= 0; --i) {
    let mant1Word = mant1[i]
    let mant1Lo = mant1Word & 0x7FFF
    let mant1Hi = mant1Word >> 15

    let carry = 0
    for (let j = Math.min(targetMantissaLen - i, mant2Len - 1); j >= 0; --j) {
      let writeIndex = i + j

      let mant2Word = mant2[j]
      let mant2Lo = mant2Word & 0x7FFF
      let mant2Hi = mant2Word >> 15

      let low = Math.imul(mant1Lo, mant2Lo)
      let high = Math.imul(mant1Hi, mant2Hi)
      let middle = Math.imul(mant1Hi, mant2Lo) + Math.imul(mant1Lo, mant2Hi)

      low = low + ((middle & 0x7FFF) << 15) + ((writeIndex < targetMantissa.length) ? targetMantissa[writeIndex] : 0) + carry
      low >>>= 0

      if (low > 0x3FFFFFFF) {
        high += low >>> 30
        low &= 0x3FFFFFFF
      }

      high += middle >> 15

      if (writeIndex < targetMantissaLen) targetMantissa[i + j] = low
      carry = high
    }

    if (i > 0) {
      targetMantissa[i - 1] += carry
    } else {
      highestWord = carry
    }
  }

  let shift = -1

  if (highestWord !== 0) {
    rightShiftMantissaInPlace(targetMantissa, 30)

    targetMantissa[0] = highestWord
    shift = 0
  }

  let roundingShift = roundMantissaToPrecision(targetMantissa, precision, targetMantissa, roundingMode)

  return shift + roundingShift
}

/**
 * Ah, the formidable division. I really don't know how to do division besides a boring shift and subtract approach,
 * generating a couple bits at a time. So in keeping with the challenge of doing this stuff without outside references,
 * I guess that's what I'll do for now!!!11
 * @param mant1 {Int32Array}
 * @param mant2 {Int32Array}
 * @param precision {number}
 * @param targetMantissa {Int32Array}
 * @param roundingMode {number}
 */
export function divMantissas (mant1, mant2, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  // Init mant1Copy with a shifted copy of mant1
  let mant1Copy = new Int32Array(Math.max(mant1.length + 1, mant2.length))
  for (let i = 0; i < mant1.length; ++i) mant1Copy[i+1] = mant1[i]

  /**
   * Get the number of leading zeros in the shifting mantissa, plus 2 (due to clz32), and -1 if it's all zeros.
   * @returns {number}
   */
  function getMant1LeadingZeros () {
    for (let i = 0; i < mant1Copy.length; ++i) {
      let word = mant1Copy[i]
      if (word > 0) return Math.clz32(word) + 30 * i
    }

    return -1
  }

  for (let i = targetMantissa.length - 1; i >= 0; --i) {
    targetMantissa[i] = 0
  }

  let newMantissaShift = 1

  // Index of the highest bit and last significant bit within newMantissa (uninitialized) TODO
  let firstBitIndex = -1, lastSignificantBit = 1 << 30 // maybe v8 can optimize this to be an integer :P

  // Index of the current bit we are writing to
  let bitIndex = -1

  // Info of the bits coming after the last significant bit TODO
  let trailingInfo = 0

  function pushZeroBits (count) {
    if (bitIndex === -1 && count >= 31) {
      // For the cases in which the first word is 0
      newMantissaShift -= 1
      bitIndex += count - 30
    } else {
      bitIndex += count
    }
  }

  function pushOneBit () {
    if (bitIndex > lastSignificantBit) {
      // At this point, we can determine the trailing info.

      if (bitIndex === lastSignificantBit + 1) {
        if (getMant1LeadingZeros() === -1) {
          trailingInfo = 2
        } else {
          trailingInfo = 3
        }
      } else {
        trailingInfo = 1
      }

      return true
    }

    let subIndex = (bitIndex / 30) | 0
    let bit = (29 - (bitIndex % 30))

    targetMantissa[subIndex] += 1 << bit

    if (firstBitIndex === -1) {
      firstBitIndex = bitIndex
      lastSignificantBit = firstBitIndex + precision - 1
    }

    return false
  }

  let mant2LeadingZeros = Math.clz32(mant2[0])

  while (true) {
    let mant1Zeros = getMant1LeadingZeros()

    if (mant1Zeros === -1) break
    let shift = mant1Zeros - mant2LeadingZeros

    if (shift !== 0) {
      leftShiftMantissaInPlace(mant1Copy, shift)
      pushZeroBits(shift)
    }

    let cmp = compareMantissas(mant1Copy, mant2)
    if (cmp === -1) {
      leftShiftMantissaInPlace(mant1Copy, 1)
      pushZeroBits(1)
    } else if (cmp === 0) {
      pushOneBit()
      break
    }

    // Subtract mant2 from mant1
    let carry = 0
    for (let i = mant2.length; i >= 0; --i) {
      let word = mant1Copy[i] - mant2[i] - carry
      if (word < 0) {
        word += BIGFLOAT_WORD_SIZE
        carry = 1
      } else {
        carry = 0
      }

      mant1Copy[i] = word
    }

    // Note that carry will sometimes be -1 at this point, when the cmp === -1 shift has truncated off the highest bit
    // of mant1Copy. This is intentional

    if (pushOneBit()) break
  }

  const roundingShift = roundMantissaToPrecision(targetMantissa, precision, targetMantissa, roundingMode, trailingInfo, 1)

  return newMantissaShift + roundingShift
}

/**
 * Determine which of two mantissas is larger. -1 if mant1 is smaller, 0 if they are equal, and 1 if mant2 is larger.
 * @param mant1
 * @param mant2
 */
export function compareMantissas (mant1, mant2) {
  let swapResult = false
  if (mant1.length < mant2.length) {
    [ mant1, mant2 ] = [ mant2, mant1 ]
  }

  let mant1Len = mant1.length, mant2Len = mant2.length

  let result = 0
  for (let i = 0; i < mant1Len; ++i) {
    let mant1Word = mant1[i]
    let mant2Word = (i < mant2Len) ? mant2[i] : 0

    if (mant1Word > mant2Word) {
      result = 1
      break
    } else if (mant1Word < mant2Word) {
      result = -1
      break
    }
  }

  return swapResult ? -result : result
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
    let float = BigFloat.new(precision)
    float.setFromNumber(num, roundingMode)

    return float
  }

  setFromNumber (num, roundingMode=CURRENT_ROUNDING_MODE) {
    if (num === 0 || !Number.isFinite(num)) {
      this.sign = num + 0
      return
    }

    // In the odd case we want a lower precision, we create a normal precision and then downcast
    if (this.prec < 53) {
      this.set(BigFloat.fromNumber(num, { precision: 53, roundingMode }).toBigFloat({ precision: this.prec }))
      return
    }

    const outMantissa = this.mant

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
    if (bitshift > 8) {
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

    this.exp = newExp
    this.sign = Math.sign(num) + 0
  }

  /**
   * Create a new BigFloat, initialized to 0
   * @param precision
   * @returns {BigFloat}
   */
  static new (precision=CURRENT_PRECISION) {
    return new BigFloat(0, 0, precision, createMantissaForPrecision(precision))
  }

  /**
   * Set this float's parameters to another float's parameters
   * @param {BigFloat} float
   */
  set (float) {
    this.sign = float.sign
    this.mant = new Int32Array(float.mant)
    this.exp = float.exp
    this.prec = float.prec
  }

  /**
   * Convert this float into a float with a different precision, rounded in the correct direction
   * @param precision
   * @param roundingMode
   */
  toBigFloat ({ precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE }) {
    let newMantissa = createMantissaForPrecision(precision)
    let { mant, sign, exp } = this

    if (this.sign !== 0 && Number.isFinite(sign)) {
      let shift = roundMantissaToPrecision(mant, precision, newMantissa, roundingMode)

      exp += shift
    }

    return new BigFloat(sign, exp, precision, newMantissa)
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
   * @param f32 {boolean} Whether to cast to a float32 instead of a float64
   * @returns {number}
   */
  toNumber ({ roundingMode = CURRENT_ROUNDING_MODE, f32 = false } = {}) {
    if (this.sign === 0 || !Number.isFinite(this.sign)) return this.sign

    let prec = f32 ? 24 : 53
    let roundedMantissa = createMantissaForPrecision(prec)

    // Round to the nearest float32 or float64, ignoring denormal numbers for now
    const shift = roundMantissaToPrecision(this.mant, prec, roundedMantissa, roundingMode)

    // Calculate an exponent and mant such that mant * 2^exponent = the number
    let exponent = (this.exp - 1) * BIGFLOAT_WORD_BITS, mant

    if (shift) {
      mant = 1 << 30
    } else {
      mant = roundedMantissa[0] + roundedMantissa[1] * pow2(-BIGFLOAT_WORD_BITS) + (f32 ? 0 : roundedMantissa[2] * pow2(-2 * BIGFLOAT_WORD_BITS))
    }

    // Normalize mant to be in the range [0.5, 1), which lines up exactly with a normal double
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
        // Deciding between 0 and Number.MIN_VALUE. Unfortunately at 0.5 * 2^1074 there is a TIE
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

  static cmpMagnitude (f1, f2) {
    if (f1.exp < f2.exp) {
      return -1
    } else if (f1.exp > f2.exp) {
      return 1
    } else {
      return compareMantissas(f1.mant, f2.mant)
    }
  }

  /**
   * Add floats f1 and f2 to the target float, using the precision of the target. This function does not allow aliasing.
   *
   * @param f1 {BigFloat} The first float
   * @param f2 {BigFloat} The second float
   * @param target {BigFloat} The target float
   * @param roundingMode {number} The rounding mode
   * @param flipF2Sign {boolean} Whether to flip the sign of f2 (used to simplify the subtraction code)
   */
  static add (f1, f2, target, roundingMode=CURRENT_ROUNDING_MODE, flipF2Sign=false) {
    // To make subtraction less of a headache
    let f1Sign = f1.sign
    let f2Sign = flipF2Sign ? -f2.sign : f2.sign

    if (!Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) {
      target.sign = f1Sign + f2Sign + 0
      return
    }

    if (f1Sign === 0) {
      target.setFromFloat(f2, roundingMode)
      if (flipF2Sign)
        target.sign *= -1

      return
    }

    if (f2Sign === 0) {
      target.setFromFloat(f1, roundingMode)
      return
    }

    function swapF1F2 () {
      [ f1, f2 ] = [ f2, f1 ]
      ;[ f1Sign, f2Sign ] = [ f2Sign, f1Sign ]
    }

    let targetPrecision = target.prec
    let targetMantissa = target.mant

    if (f1Sign !== f2Sign) {
      let cmp = BigFloat.cmpMagnitude(f1, f2)
      let sign = 0

      if (cmp === 0) target.setZero()
      if (cmp === 1)
        sign = f1Sign
      else
        sign = f2Sign
      if (cmp === -1) swapF1F2()

      let shift = subtractMantissas(f1.mant, f2.mant, f1.exp - f2.exp, targetPrecision, targetMantissa, roundingMode)

      target.sign = sign
      target.exp = f1.exp + shift
    } else {
      if (f1.exp < f2.exp) swapF1F2()

      let shift = addMantissas(f1.mant, f2.mant, f1.exp - f2.exp, targetPrecision, targetMantissa, roundingMode)

      target.sign = f1Sign
      target.exp = f1.exp + shift
    }
  }

  /**
   * Subtract two numbers and write the result to the target.
   * @param f1 {BigFloat}
   * @param f2 {BigFloat}
   * @param target {BigFloat}
   * @param roundingMode {number}
   */
  static subtract (f1, f2, target, roundingMode=CURRENT_ROUNDING_MODE) {
    BigFloat.add(f1, f2, target, roundingMode, true)
  }

  static mul (f1, f2, target, roundingMode=CURRENT_ROUNDING_MODE) {
    let f1Sign = f1.sign
    let f2Sign = f2.sign

    target.sign = f1Sign * f2Sign

    if (f1Sign === 0 || f2Sign === 0 || !Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) return

    if (f1.exp < f2.exp) {
      [ f1, f2 ] = [ f2, f1 ]
    }

    let shift = multiplyMantissas(f1.mant, f2.mant, target.prec, target.mant, roundingMode)
    target.exp = f1.exp + f2.exp + shift
  }

  static mul2 (f1, f2, target, roundingMode=CURRENT_ROUNDING_MODE) {
    let f1Sign = f1.sign
    let f2Sign = f2.sign

    target.sign = f1Sign * f2Sign

    if (f1Sign === 0 || f2Sign === 0 || !Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) return

    if (f1.exp < f2.exp) {
      [ f1, f2 ] = [ f2, f1 ]
    }

    let shift = multiplyMantissas2(f1.mant, f2.mant, target.prec, target.mant, roundingMode)
    target.exp = f1.exp + f2.exp + shift
  }

  /**
   * Multiply a float by a JS number, writing the result to the target. This function does support aliasing.
   * @param f1
   * @param num
   * @param target
   * @param roundingMode
   */
  static mulNumber (f1, num, target, roundingMode=CURRENT_ROUNDING_MODE) {
    let isAliased = f1 === target

    if (num === 0) {
      target.setZero()
    } else if (num === 1) {
      if (!isAliased) target.setFromFloat(f1)
      return
    }

    if (Number.isInteger(num)) {
      let absNum = Math.abs(num)

      if (absNum <= 0x3fffffff) {
        let shift = multiplyMantissaByInteger(f1.mant, num, target.prec, target.mant, roundingMode)

        target.sign = f1.sign * Math.sign(num)
        target.exp = f1.exp + shift

        return
      }
    }

    if (isAliased) {
      let tmp = BigFloat.new(target.prec)

      BigFloat.mul(f1, BigFloat.fromNumber(num), tmp, roundingMode)
      target.set(tmp)
    } else {
      BigFloat.mul(f1, BigFloat.fromNumber(num), target, roundingMode)
    }
  }

  static div (f1, f2, target, roundingMode=CURRENT_ROUNDING_MODE) {
    let f1Sign = f1.sign
    let f2Sign = f2.sign

    if (f1Sign === 0 || f2Sign === 0 || !Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) {
      target.sign = f1Sign / f2Sign
      return
    }

    let shift = divMantissas(f1.mant, f2.mant, target.prec, target.mant, roundingMode)

    target.exp = f1.exp - f2.exp + shift
    target.sign = f1Sign / f2Sign
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
    this.sign = 0
  }

  neg () {
    return new BigFloat(this.sign * -1, this.exp, this.prec, new Int32Array(this.mant))
  }

  /**
   * Set this float to the value of another float, keeping the current precision.
   * @param f {BigFloat}
   * @param roundingMode {number}
   */
  setFromFloat (f, roundingMode=CURRENT_ROUNDING_MODE) {
    if (f.prec === this.prec) {
      this.sign = f.sign

      let thisMant = this.mant
      for (let i = 0; i < thisMant.length; ++i) {
        thisMant[i] = f.mant[i]
      }

      this.exp = f.exp
      return
    }

    this.sign = f.sign
    this.exp = f.exp

    roundMantissaToPrecision(f.mant, this.prec, this.mant, roundingMode)
  }

  toUnderstandableString () {
    return prettyPrintFloat(this.mant, this.prec)
  }
}
