import {isTypedArray, leftZeroPad} from "../../core/utils.js"
import {integerExp, rationalExp} from "../real/fp_manip.js"

const digitsOut = '0123456789abcdefghijklmnopqrstuvwxyz'
const base10Verify = /^[0-9]+$/

const BIGINT_WORD_BITS = 30
const BIGINT_WORD_PART_BITS = BIGINT_WORD_BITS / 2

const BIGINT_WORD_BIT_MASK = 0x3FFFFFFF          // get the last 30 bits of a given word (removing the two junk bits)
const BIGINT_WORD_LOW_PART_BIT_MASK = 0x7FFF     // get the last 15 bits of a given word. Getting the high part is just >> 15
const BIGINT_WORD_OVERFLOW_BIT_MASK = 0x40000000 // get the overflow bit of a given word (aka the 31st bit)


const BIGINT_WORD_SIZE = 2 ** BIGINT_WORD_BITS
const BIGINT_WORD_MAX = BIGINT_WORD_SIZE - 1

const ROUNDING_MODE = {
  TOWARD_ZERO: 0,    // Go toward zero from either direction (0.5 -> 0), (-0.9 -> 0)
  TOWARD_INF: 1,     // Go away from zero in either direction. (0.1 -> 1), (-0.1 -> -1)
  UP: 2,             // Round up (-0.9 -> 0), (1.1 -> 2)

}

/**
 * Return the number of bits a given word uses.
 */
function wordBitCount (word) {
  return 32 - Math.clz32(word)
}

/**
 * Get the number of bits used by a given set of 30-bit words.
 * @param words
 * @param wordCount
 * @returns {*}
 */
function getBitCount (words, wordCount) {
  let lastIndex = wordCount - 1
  const lastWord = words[lastIndex]

  return wordBitCount(lastWord) + lastIndex * BIGINT_WORD_BITS
}

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

// Multiply two 30-bit words and return the low and high part of the result
export function mulWords (word1, word2) {
  return mulAddWords(word1, word2, 0)
}

// Multiply and add three 30-bit words and return the low and high part of the result. (word1 * word2 + word3)
export function mulAddWords (word1, word2, word3) {
  let word1Lo = word1 & BIGINT_WORD_LOW_PART_BIT_MASK
  let word2Lo = word2 & BIGINT_WORD_LOW_PART_BIT_MASK
  let word1Hi = word1 >> BIGINT_WORD_PART_BITS
  let word2Hi = word2 >> BIGINT_WORD_PART_BITS

  let low = Math.imul(word1Lo, word2Lo), high = Math.imul(word1Hi, word2Hi)
  let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi)

  low += (middle & BIGINT_WORD_LOW_PART_BIT_MASK) << BIGINT_WORD_PART_BITS

  if ((low & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
    low &= BIGINT_WORD_BIT_MASK
    high += 1
  }

  low += word3

  if ((low & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
    low &= BIGINT_WORD_BIT_MASK
    high += 1
  }

  high += middle >> BIGINT_WORD_PART_BITS // add the high part of middle

  return [ low, high ]
}

// Left shift a set of words, assuming there is enough space
export function leftShiftWordsInPlace (words, wordCount, shift) {
  shift = shift | 0
  wordCount = wordCount | 0

  if (shift === 0) return [ words, wordCount ]


}

/**
 * Add the given words to the targetWords array, doing the carries, etc. in place; if the
 * @param targetWords
 * @param words
 * @param wordCount
 * @param shift
 */
function addLongIntsInPlace (targetWords, words, wordCount, shift=0) {

}

/**
 * Multiply two 30-bit word arrays, each with words1Count and words2Count words respectively, returning an Int32Array
 * and wordCount pair
 * @param words1 {Int32Array}
 * @param words1Count {number}
 * @param words2 {Int32Array}
 * @param words2Count {number}
 */
function multiplyLongInts (words1, words1Count, words2, words2Count) {
  const outWords = new Int32Array(words1Count + words2Count)

  // Textbook multiplication! We start with each word of words1, multiply it by words2 and shift it the appropriate
  // amount, and add the result to outWords


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

// lol
const NativeBigInt = (0n).constructor

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
  constructor (arg1, arg2) {
    if (typeof arg1 === "number") {
      this.initFromNumber(arg1)
    } else if (typeof arg1 === "string") {
      this.initFromString(arg1, arg2)
    } else if (typeof arg1 === "bigint") {
      this.initFromNativeBigint(arg1)
    } else if (arg1 instanceof BigInt) {
      this.initFromBigint(arg1)
    }
  }

  addInPlace (num) {
    // We just add num to the starting number and carry, allocating more space if needed

    const { words } = this

  }

  /**
   * Increase the size of the backing Int32Array to allow bitCount bits to be stored
   * @param bitCount
   */
  allocateBits (bitCount) {
    this.allocateWords(Math.ceil(bitCount / BIGINT_WORD_BITS))
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
   * Get the total number of bits used; in other words, the number of bits in the last word + the number of bits in all
   * the preceding words
   */
  bitCount () {
    return getBitCount(this.words, this.wordCount)
  }

  initZero () {
    this.words = new Int32Array(1)
    this.wordCount = 1
    this.sign = 0
  }

  /**
   * We construct words, wordCount and sign from a JS number. If val is NaN or ±Infinity, we throw an error. Profiling:
   * on 5/26/2021, got 0.00025 ms/iteration for random floats in [0, 1e6]. Also got 0.0016 ms/iteration for random floats
   * in [0, 1e200], which is more a reflection of the performance of leftShiftInPlace.
   * @param val
   */
  initFromNumber (val) {
    if (!Number.isFinite(val)) throw new RangeError("Numeric value passed to BigInt constructor must be finite")

    val = Math.trunc(val)           // Guaranteed to be an integer
    const sign = Math.sign(val) + 0 // convert -0 to +0 :D

    val *= sign

    if (val < BIGINT_WORD_MAX) { // can initialize directly=
      this.initFromWords( [ val ], sign)
      return
    }


    // We now convert the number into the form [i, e] where i is an integer within the 2^53 range and e is an exponent.
    // The bit pattern of the number is thus
    //     1 0 1 0 0 0 1 0 1 0 0 1  0 0 0 0 0 0 0 0 0 0 0 0 0
    //     -----------------------  -------------------------
    //            integer i               e extra zeroes
    // Funnily enough, all integers are represented in this way, even if they aren't massive. But it is consistent.
    // Thus, we initialize with two words corresponding to the upper and lower halves of the 53-bit integer i, then
    // left shift the bits by the exponent e times.
    let [ integer, exponent ] = integerExp(val)

    this.initFromWords([ integer % BIGINT_WORD_SIZE, Math.floor(integer / BIGINT_WORD_SIZE) ], sign)
    this.leftShiftInPlace(exponent)
  }

  clone () {
    return new BigInt(this)
  }

  initFromString (val, radix=10) {
    // Exciting! There are a few ideas I have about converting decimal to binary. The obvious solution is to just
    // repeatedly multiply by 10 and add various digits. Not that efficient though. Probably the first thing to do is
    // chunk it, as with the conversion from binary to decimal from earlier. I'm not sure whether a chunk size of an
    // int32 size or a safe f64 integral size will be better; if I do ever use asm.js then obviously the first will be
    // used. Anyway, the input is given in some radix, then chunked into components of some max size. Suppose we have
    // a chunking size of 1 million, for example, and we want to convert the number 1,234,567,891,011,121,314,151 into
    // our 30-bit word format. Then we first chunk it up into [1234, 567891, 11121, 314151]. Then we add 1234, then
    // multiply by 1000000, then add 567891, then multiply by 1000000, then add 314151, to get the final answer. We do
    // these operations on a 30-bit word. As to whether a bigint should be used... why not, I guess? We'll implement
    // some addInPlace, multiplyInPlace functions that accept numerical constants as well as other BigInts.

    if (!Number.isInteger(radix) || radix < 2 || radix > 36) throw new RangeError("Radix must be an integer between 2 and 36")


  }

  /**
   * Create Grapheme bigint from native bigint
   * @param int {bigint}
   */
  initFromNativeBigint (int) {
    // We basically just use repeated bit shifts to get all the words we want.
    let words = []
    let sign = 1

    if (int === 0n) {
      this.initZero()
    } else if (int < 0n) {
      sign = -1
      int = -int
    }

    const mask = NativeBigInt(BIGINT_WORD_BIT_MASK)
    const wordBits = NativeBigInt(BIGINT_WORD_BITS)

    while (int) {
      words.push(Number(int & mask))

      int >>= wordBits
    }

    this.initFromWords(words, sign)
  }

  /**
   * Init from another Grapheme bigint
   * @param int
   */
  initFromBigint (int) {
    let { words, sign, wordCount } = int

    this.words = new Int32Array(words.subarray(0, wordCount))
    this.sign = sign
    this.wordCount = wordCount
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

  initFromSingleWord (word, sign=1) {
    this.words = new Int32Array(word, sign)
  }

  /**
   * Returns true if the big integer is zero.
   * @returns {boolean}
   */
  isZero () {
    return this.wordCount === 1 && this.words[0] === 0
  }

  leftShiftInPlace (count) {
    count = count | 0

    if (!Number.isInteger(count) || count < 0) throw new RangeError("Left shift count must be a nonnegative integer")
    if (count === 0) return

    // Number of bits after shifting
    let newBitCount = this.bitCount() + count
    this.allocateBits(newBitCount)

    let { words, wordCount } = this

    // We split up the shift into a multiple of 30 shift and a normal shift.
    let shifts = count % BIGINT_WORD_BITS
    let wordShifts = Math.floor(count / BIGINT_WORD_BITS)

    if (count >= BIGINT_WORD_BITS) {
      // We use copyWithin to shift the current words from [0, wordCount - 1] to [wordShifts, wordShifts + wordCount - 1]
      words.copyWithin(wordShifts, 0, wordCount)

      // Fill [0, wordShifts - 1] with 0s
      words.fill(0, 0, wordShifts)

      wordCount += wordShifts
    }

    if (shifts !== 0) {
      // We now perform a smaller shift in which we iterate from [wordCount - 1] down to 0 and shift the current value of
      // the cell up by <shifts>. We know that shifts is less than 30. The algorithm here is to take the word value, right
      // shift it by (30 - shift value), and add that to the larger word. Then, shift the word value to the left by
      // (shift value), remove the extra 31st and 32nd bits with & 0x3FFFFFFF, and rewrite the word.
      let rightShift = BIGINT_WORD_BITS - shifts

      for (let i = wordCount - 1; i >= wordShifts; --i) {
        let word = words[i]
        let carry = word >> rightShift

        if (carry !== 0) words[i + 1] += carry

        word <<= shifts
        words[i] = word & BIGINT_WORD_BIT_MASK
      }
    }

    // Should be reliable
    this.wordCount = Math.ceil(newBitCount / BIGINT_WORD_BITS)
  }

  rightShiftInPlace (count) {
    count = count | 0

    if (!Number.isInteger(count) || count < 0) throw new RangeError("Right shift count must be a nonnegative integer")
    if (count === 0) return

    // Number of bits after shifting
    let newBitCount = this.bitCount() - count
    if (newBitCount <= 0) {
      this.setZero()
      return
    }



    this.wordCount = Math.ceil(newBitCount / BIGINT_WORD_BITS)
  }

  multiplyInPlace (val) {
    if (val < BIGINT_WORD_MAX) {
      this.allocateBits(wordBitCount(val) + this.bitCount())

      const { words, wordCount } = this

      let carry = 0
      for (let i = 0; i < wordCount; ++i) {
        const [ lo, hi ] = mulAddWords(words[i], val, carry)

        words[i] = lo
        carry = hi
      }

      if (carry !== 0) words[wordCount] = carry
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

  setZero () {
    this.words = new Int32Array(1)
    this.wordCount = 0
    this.sign = 0

    return this
  }

  /**
   * Returns an array of integers corresponding to the digits in the expansion of a given radix. For example, converting
   * the BigInt corresponding to 5002 (20212021 base 3) to radix 3 will give [1, 2, 0, 2, 1, 2, 0, 2]. 0 gives an empty
   * array for all inputs. This function is relatively important to optimize, especially for radix=10, because it is
   * expensive but important.
   * @param radix {number} Base for the conversion; should be an integer between 2 and 1073741824. Technically
   * you could have MAX_SAFE_INTEGER as a limit, but eh.
   */
  toRadixInternal (radix) {
    radix = +radix

    if (!Number.isInteger(radix) || radix <= 1 || radix >= Number.MAX_SAFE_INTEGER) throw new RangeError("Base of radix conversion must be an integer between 2 and 2^53 - 1, inclusive.")

    // We construct the output via decomposing the integer into a series of operations of either x * 2 or x + 1,
    // applying each to the digitsOut array. These operations correspond to the bits of the BigInt in reverse order.
    const digitsOut = []
    const { words } = this

    let queuedMultiplications = 0

    // For each word, starting at the most significant word...
    for (let wordIndex = words.length - 1; wordIndex >= 0; --wordIndex) {
      let word = words[wordIndex]

      for (let j = 0; j < BIGINT_WORD_BITS; ++j) {
        queuedMultiplications++
        word <<= 1

        // For each bit in the word, from most to least significant
        if ((word & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
          // Run the queued multiplications
          for (let k = 0; k < queuedMultiplications; ++k) {
            let carry = 0, i = 0
            for (; i < digitsOut.length; ++i) {
              let currentDigit = digitsOut[i]
              let newDigit = (currentDigit * 2) + carry

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

          queuedMultiplications = 0

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
            if (carry === 0) break // early exit condition
          }

          if (carry === 1) digitsOut[i] = 1
        }
      }
    }

    while (queuedMultiplications > 0) {
      if (queuedMultiplications > 1) {
        let carry = 0, i = 0
        for (; i < digitsOut.length; ++i) {
          let currentDigit = digitsOut[i]
          let newDigit = (currentDigit * 4) + carry

          if (newDigit >= radix) {
            newDigit -= radix
            if (newDigit >= radix) {
              newDigit -= radix
              if (newDigit >= radix) {
                newDigit -= radix
                carry = 3
              } else {
                carry = 2
              }
            } else {
              carry = 1
            }
          } else {
            carry = 0
          }

          digitsOut[i] = newDigit
        }
        if (carry !== 0) digitsOut[i] = carry

        queuedMultiplications -= 2
      } else {
        let carry = 0, i = 0
        for (; i < digitsOut.length; ++i) {
          let currentDigit = digitsOut[i]
          let newDigit = (currentDigit * 2) + carry

          if (newDigit >= radix) {
            newDigit -= radix
            carry = 1
          } else {
            carry = 0
          }

          digitsOut[i] = newDigit
        }
        if (carry === 1) digitsOut[i] = 1

        queuedMultiplications--
      }
    }

    return digitsOut
  }

  toString (radix=10) {
    // We *could* convert to base 10, but it's more efficient to convert to base 10^15 and then zero pad and concat
    // the results. That way we can take advantage of the internal, very quick int -> string function

    const CHUNK_EXPONENT = 15

    if (!Number.isInteger(radix) || radix < 2 || radix > 36) throw new RangeError("Base of radix conversion must be an integer between 2 and 36, inclusive.")

    if (radix === 10) {
      const digits = this.toRadixInternal(10 ** CHUNK_EXPONENT)

      let out = (this.sign < 0 ? '-' : '') + digits[digits.length - 1]
      for (let i = digits.length - 2; i >= 0; --i) {
        out += leftZeroPad('' + digits[i], CHUNK_EXPONENT, '0')
      }

      return out
    } else {
      // May optimize later

      return (this.sign < 0 ? '-' : '') + this.toRadixInternal(radix).reverse().map(digit => digit.toString(radix)).join('')
    }

  }

  /**
   * Convert the bigint to its closest double representation with the given rounding mode.
   */
  toNumber () {

  }

  toBigint () { // Not too hard, we just construct it from the words in order
    const { words } = this

    let out = 0n
    let wordBits = NativeBigInt(BIGINT_WORD_BITS)

    for (let i = this.wordCount - 1; i >= 0; --i) {
      out <<= wordBits
      out += NativeBigInt(words[i])
    }

    return out
  }
}
