import {isTypedArray, zeroFill} from "../../core/utils"
import {integerExp, rationalExp} from "../real/fp_manip"

const digitsOut = '0123456789abcdefghijklmnopqrstuvwxyz'
const base10Verify = /^[0-9]+$/

const BIGINT_WORD_BITS = 30
const BIGINT_WORD_SIZE = 2 ** BIGINT_WORD_BITS
const MAX_BIGINT_WORD = BIGINT_WORD_SIZE - 1

function fromStringBase10 (str) {
  // Verify the string is okay
  if (!str.match(base10Verify)) {
    str.forEach(char => {
      if (!isValidDigit(char.charCodeAt(0), 10)) { throw new Error(`Invalid digit '${char}'`) }
    })
  }

  // We operate on the words themselves for extra optimizations
  const pow10Words = []
  const ret = BigInt.one()

  for (let i = str.length - 1; i >= 0; --i) {
    // 0 through 9
    const v = str.charCodeAt(i) - 48

    ret.multiplyAddInPlace(base, 10)
  }
}

function fromString (str, radix) {
  const negative = str[0] === '-'
  if (negative || str[0] === '+') str = str.substring(1)

  if (!str) return new BigInt(0, 0)

  // The most critical implementation
  if (radix === 10) return fromStringBase10(str).multiplyInPlace(negative ? 1 : -1)

  // Verify that the string is valid
  for (let i = 0; i < str.length; ++i) {
    const charCode = str.charCodeAt(i)

    if (!isValidDigit(radix, charCode)) throw new Error(`Invalid digit '${str[i]}'`)
  }
}

function isValidDigit (base, digitCode) {
  // Bases <= 10
  if (base <= 10) return digitCode >= 48 && digitCode < (base + 48)

  // Other bases
  return (digitCode >= 48 && digitCode < 57) || (digitCode >= 97 && digitCode < (87 + base))
}

/**
 * Remove trailing zeroes from an array or typed array (returning a subarray in the latter case for efficiency)
 * @param array
 */
function trimTrailingZeroes (array) {
  const isArray = Array.isArray(array)
  if (isArray || isTypedArray(array)) {
    let i = array.length - 1
    for (; i >= 0; --i) {
      if (array[i] !== 0) break
    }
    if (i === -1) return isArray ? [0] : new Int32Array(1)

    return isArray ? array.slice(0, i+1) : array.subarray(0, i+1)
  } else {
    throw new TypeError("trimTrailingZeroes only operates on Arrays and TypedArrays")
  }
}

/**
 * Big integers in JS! I would use the native implementation or JSBI, but I want a pretty customized setup for fast
 * multiplication, division, et cetera. Also, this will be fun.
 *
 * We represent a big-integer with an array of unsigned 30-bit words with the least significant bit at the front, and a
 * sign (-1, 0, or 1). Big-integers are not immutable and may be modified via certain in-place operations.
 *
 * As an example, "-45" is represented with { sign: -1, words: [45] }. "-1073741823" is { sign: -1, words: [ 1073741823 ] },
 * while "-1073741824" is { sign: -1, words: [ 0, 1 ]}. wordCount is the number of elements of words that are actually
 * used, which helps sometimes when the array shrinks and the top elements are all 0. "0" simply represented with a
 * wordCount of 1 and a single word 0. We will generally use typed arrays in here, specifically the Int32Array,
 * which may allow some asm.js fun in the future!
 */
export class BigInt {
  constructor (val) {
    if (typeof val === "number") {
      this.initFromNumber(val)
    }
  }

  /**
   * We construct words, wordCount and sign from a JS number. If val is NaN or ±Infinity, we throw an error.
   * @param val
   */
  initFromNumber (val) {
    if (!Number.isFinite(val)) throw new RangeError("Numeric value passed to BigInt constructor must be finite")

    // Truncate the number so that it is guaranteed to be an integer
    val = Math.trunc(val)

    // We now convert the number into the form [i, e] where i is an integer within the 2^53 range and e is an exponent.
    // The bit pattern of the number is thus
    //     1 0 1 0 0 0 1 0 1 0 0 1  0 0 0 0 0 0 0 0 0 0 0 0 0
    //     -----------------------  -------------------------
    //            integer i               e extra zeroes
    // Funnily enough, all integers are represented in this way, even if they aren't massive. But it is consistent.
    // Thus, we initialize with two words corresponding to the upper and lower halves of the 53-bit integer i, then
    // left shift the bits by the exponent e times.
    let [ integer, exponent ] = integerExp(val)
    const sign = Math.sign(integer)

    integer = integer * sign

    this.initFromWords([ integer % MAX_BIGINT_WORD, Math.floor(integer / MAX_BIGINT_WORD) ], sign)
    this.leftShiftInPlace(exponent)
  }

  // This operation isn't too complicated; we just have to copy words over. If count is a multiple of 30, that makes
  // life particularly easy, but otherwise we just shift term by term.
  leftShiftInPlace (count) {
    count = +count

    if (!Number.isInteger(count) || count < 0) throw new RangeError("Left shift count must be a nonnegative integer")
    if (count === 0) return

    this.allocateBits(this.bitCount() + count)

    let { words, wordCount } = this

    // We split up the shift into a multiple of 30 shift and a normal shift.
    let shifts = count % BIGINT_WORD_BITS

    if (count >= BIGINT_WORD_BITS) {
      let wordShifts = Math.floor(count / 30)

      // We use copyWithin to shift the current words from [0, wordCount - 1] to [wordShifts, wordShifts + wordCount - 1]
      words.copyWithin(wordShifts, 0, wordCount - 1)

      // Fill [0, wordShifts - 1] with 0s
      words.fill(0, 0, wordShifts)

      wordCount += wordShifts
    }

    // We now perform a smaller shift in which we iterate from [wordCount - 1] down to 0 and shift the current value of
    // the cell up by <shifts>. We know that shifts is less than 30. The algorithm here is to take the word value, right
    // shift it by (30 - shift value), and add that to the larger word. Then, shift the word value to the left by
    // (shift value), remove the extra 31st and 32nd bits with & 0x40000000, and rewrite the word.

    let rightShift = BIGINT_WORD_BITS - shifts

    for (let i = wordCount - 1; i >= 0; --i) {
      let word = words[i]


    }
  }

  /**
   * Get the word count by starting at the end of the array, searching for 0s and setting the wordCount accordingly.
   */
  recomputeWordCount () {
    const { words } = this

    for (let i = words.length - 1; i >= 0; ++i) {
      if (words[i] !== 0) {
        this.wordCount = i + 1
        return
      }
    }

    this.wordCount = 1 // There is always at least one word, even if the bigint has value 0
  }

  /**
   * Returns true if the big integer is zero.
   * @returns {boolean}
   */
  isZero () {
    return this.wordCount === 1 && this.words[0] === 0
  }

  /**
   * Increase the size of the backing Int32Array, copying over the contents from the previous one
   * @param wordCount
   */
  allocateWords (wordCount) {
    if (wordCount <= this.words.length) return

    const newWords = new Int32Array(wordCount)
    newWords.set(this.words)

    this.words = newWords
  }

  /**
   * Increase the size of the backing Int32Array to allow bitCount bits to be stored
   * @param bitCount
   */
  allocateBits (bitCount) {
    this.allocateWords(Math.ceil(bitCount / BIGINT_WORD_BITS))
  }

  /**
   * Get the total number of bits used; in other words, the number of bits in the last word + the number of bits in all
   * the preceding words
   */
  bitCount () {
    const lastWord = this.words[this.wordCount - 1]

    return (32 - Math.clz32(lastWord)) + (this.wordCount - 1) * BIGINT_WORD_BITS
  }

  /**
   * Sign 0 is 0, sign 1 is 1, sign -1 is -1. There is no negative zero big int.
   * @param words
   * @param sign
   */
  initFromWords(words, sign=1) {
    words = trimTrailingZeroes(words)

    this.words = new Int32Array(words)
    this.wordCount = words.length
    this.sign = sign
  }

  static zero () {
    return new BigInt(0, 0)
  }

  static one () {
    return new BigInt([ 1 ], 1)
  }

  /**
   * Supported forms:
   *
   * Whitespace is trimmed. After this stage, it handles anything of the form -?[0-9a-z]+, throwing an error if the
   * base is out of range
   * @param str
   * @param radix
   */
  static fromString (str, radix = 10) {
    radix = Number(radix)

    if (radix < 2 || radix > digitsOut.length || !Number.isInteger(radix)) {
      throw new RangeError('Invalid radix')
    }

    str = str.trim()

    return fromString(str, radix)
  }

  setZero () {
    this.words = []
    this.sign = 0

    return this
  }

  multiplyInPlace (num) {
    if (typeof num === 'number') {
      if (!Number.isInteger(num)) { throw new TypeError("Can't multiply by non-integer") }

      if (num === 0) {
        this.setZero()
      } else if (num === 1 || num === -1) {
        this.sign *= num
      } else {
        if (num < 0) this.multiplyInPlace(-1)
        num = Math.abs(num)

        if (num < 2097152) {
          const { words } = this

          for (let i = 0; i < words.length; ++i) {

          }
        }
      }
    }

    return this
  }

  /**
   * Returns an array of integers corresponding to the digits in the expansion of a given radix. For example, converting
   * the BigInt corresponding to 5002 (20212021 base 3) to radix 3 will give [1, 2, 0, 2, 1, 2, 0, 2]. 0 gives an empty
   * array for all inputs.
   * @param radix {number} Base for the conversion; should be an integer between 2 and 1073741824.
   */
  toRadixInternal (radix) {
    radix = +radix

    if (!Number.isInteger(radix) || radix <= 1 || radix >= 1073741824) throw new RangeError("Base of radix conversion must be an integer between 2 and 1073741824, inclusive.")

    // We construct the output via decomposing the integer into a series of operations of either x * 2 or x + 1,
    // applying each to the digitsOut array. These operations correspond to the bits of the BigInt in reverse order.
    const digitsOut = [0]

    function multiplyByTwo () {
      // Relatively straightforward; we just multiply each entry by 2 and add it as a carry.
      let carry = 0, i = 0

      for (; i < digitsOut.length; ++i) {
        let currentDigit = digitsOut[i]
        let newDigit = currentDigit * 2 + carry

        if (newDigit >= radix) {
          newDigit -= radix
          carry = 1
        } else {
          carry = 0
        }

        digitsOut[i] = newDigit
      }

      if (carry === 1) digitsOut[i] = 1
    }

    function addOne () {
      // Also quite straightforward; we carry 1 to the end
      let carry = 1, i = 0
      for (; i < digitsOut.length; ++i) {
        let currentDigit = digitsOut[i]
        let newDigit = currentDigit + carry

        if (newDigit >= radix) {
          newDigit = newDigit - radix
          carry = 1
        } else {
          carry = 0
        }

        digitsOut[i] = newDigit
        if (carry === 0) return // early exit condition
      }

      if (carry === 1) digitsOut[i] = 1
    }

    const { words } = this

    for (let i = words.length - 1; i >= 0; --i) {
      let word = words[i]

      for (let i = 0; i < 31; ++i) {
        multiplyByTwo()

        if (word & 0x40000000) {
          addOne()
        }

        word <<= 1
        word &= 0x7FFFFFFF
      }
    }

    return digitsOut
  }

  toString () {
    let NEW_BASE_EXPONENT = 8
    let NEW_BASE = 10 ** NEW_BASE_EXPONENT

    // Convert the number to something of the form -?[0-9]+ . We could use some sort of BigDecimal... but meh. Just have
    // an array of base 10 entries, perform a repeated operation of doubling or adding on those entries

    const sign = (this.sign < 0) ? '-' : ''
    let digits = [0] // an array of base 100000000 numbers, in reverse order


    f

    // Combine all the words as a base-100000000 number by converting each to a string, zero padding them to the left,
    // and rejoicing

    return digits.reverse().map(digit => zeroFill(digit + '', NEW_BASE_EXPONENT)).join()
  }
}
