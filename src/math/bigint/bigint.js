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

function multiplyBigInts(int1, int2) {
  let out = new Int32Array(int1.wordCount + int2.wordCount + 1)


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
    if (num <= BIGINT_WORD_MAX) {
      // For small nums, we just add and carry. It's super similar to the longer case, but we have this for speed since
      // incrementing and such is a very common operation
      const {words, wordCount} = this

      let carry = num, i = 0
      for (; i < wordCount; ++i) {
        let word = words[i] + carry

        if ((word & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
          words[i] = word & BIGINT_WORD_BIT_MASK
          carry = 1
        } else {
          words[i] = word
          carry = 0
          break
        }
      }

      // Happens when we increment from 2^30-1 to 2^30
      if (carry !== 0) {
        this.allocateWords(i + 1)
        this.words[i] = carry
        this.wordCount = i + 1
      }
    } else if (num instanceof BigInt) {
      // We'll need at most this many bits
      this.allocateBits(Math.max(num.bitCount(), this.bitCount()) + 1)

      const { words: otherWords, wordCount: otherWordCount } = num
      const { words, wordCount } = this

      // Add the other bigint's words to this one
      for (let i = 0; i < otherWordCount; ++i) {
        words[i] += otherWords[i]
      }

      // We need to check the words between [0, i] for carries
      let checkCarryCount = Math.min(otherWordCount, wordCount)

      let carry = 0, i = 0
      for (; i < words.length; ++i) {
        let word = words[i] + carry

        // Do carries
        if ((word & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
          words[i] = word & BIGINT_WORD_BIT_MASK
          carry = 1
        } else {
          carry = 0
          if (i >= checkCarryCount) break
        }
      }

      // Update word count
      this.wordCount = Math.max(i, wordCount, otherWordCount)
    } else {
      this.addInPlace(new BigInt(num))
    }
  }

  subtractInPlace (num) {
    if (num <= BIGINT_WORD_MAX) {
      // We just add num to the starting number and carry, allocating more space if needed
      const {words, wordCount} = this

      let carry = num, i = 0
      for (; i < wordCount; ++i) {
        let word = words[i] + carry

        if (word & BIGINT_WORD_OVERFLOW_BIT_MASK !== 0) {
          words[i] = word & BIGINT_WORD_BIT_MASK
          carry = 1
        } else {
          words[i] = word
          carry = 0
          break
        }
      }

      if (carry !== 0) {
        this.allocateWords(i)
        this.words[i] = carry
      }
    }
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

    if (val <= BIGINT_WORD_MAX) { // can initialize directly=
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

    return this
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
    return this
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

    return this
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

    return this
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

  /**
   * Multiply the bigint in place by a number or biginteger val
   * @param val
   */
  multiplyInPlace (val) {
    if (val <= BIGINT_WORD_MAX) {
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
    this.wordCount = 1
    this.sign = 0

    return this
  }

  /**
   * Here, we abuse floats a little bit to get a quick expansion for large radixes, as is used for base-10 conversion
   * when we chunk the number into base 10^15. The concept is quite simple; we start with the highest word, add it,
   * multiply everything by 2^30, and repeat.
   * @param radix
   * @returns {number[]}
   */
  toLargeRadixInternal (radix) {
    radix = +radix

    if (!Number.isInteger(radix) || radix <= 4294967296 || radix >= 4503599627370496) throw new RangeError("Base of radix conversion must be an integer between 4294967296 and 4503599627370496, inclusive.")

    const digitsOut = [0]
    const { words } = this

    for (let wordIndex = words.length - 1; wordIndex >= 0; --wordIndex) {
      let carry = 0, i = 0
      for (; i < digitsOut.length; ++i) {
        let digit = digitsOut[i] * BIGINT_WORD_SIZE // Because we're working with floats, this operation is exact

        // The low part, before adding the carry; this is exact
        let remainder = digit % radix

        // floor(digit / radix) is sus because the division might round up and thus be incorrect, so we nudge it
        // in the right direction. floor(x + 0.5) is slightly faster than round(x)
        let nextCarry = Math.floor((digit - remainder) / radix + 0.5)

        // Need to add the carry
        digit = remainder + carry

        // If the digit has gone beyond the radix, we need to update the next carry
        if (digit >= radix) {
          nextCarry++
          digit -= radix
        }

        digitsOut[i] = digit
        carry = nextCarry
      }

      if (carry) digitsOut[i] = carry

      let word = words[wordIndex]
      digitsOut[0] += word
    }

    return digitsOut
  }

  /**
   * Returns an array of integers corresponding to the digits in the expansion of a given radix. For example, converting
   * the BigInt corresponding to 5002 (20212021 base 3) to radix 3 will give [1, 2, 0, 2, 1, 2, 0, 2]. 0 gives an empty
   * array for all inputs. This function is relatively important to optimize, especially for radix=10, because it is
   * expensive but important. I will do some digging later, but currently it averages between 2 to 10 times slower than
   * native for some reason.
   * @param radix {number} Base for the conversion; should be an integer between 2 and 1125899906842600.
   */
  toRadixInternal (radix) {
    radix = +radix

    if (!Number.isInteger(radix) || radix <= 1 || radix >= 1125899906842600) throw new RangeError("Base of radix conversion must be an integer between 2 and 1125899906842600, inclusive.")

    // We construct the output via decomposing the integer into a series of operations of either x * 2 or x + 1,
    // applying each to the digitsOut array. These operations correspond to the bits of the BigInt in reverse order.
    const digitsOut = []
    const { words } = this

    // Is the radix large enough for these optimizations
    let canMultiplyBy8 = radix >= 8
    let canMultiplyBy4 = radix >= 4

    function doMultiplications () {
      while (queuedMultiplications > 0) {
        if (queuedMultiplications > 2 && canMultiplyBy8) {
          let carry = 0, i = 0
          for (; i < digitsOut.length; ++i) {
            let currentDigit = digitsOut[i]
            let newDigit = (currentDigit * 8) + carry

            if (newDigit < radix) {
              carry = 0
            } else if (newDigit < 2 * radix) {
              carry = 1
              newDigit -= radix
            } else if (newDigit < 3 * radix) {
              carry = 2
              newDigit -= 2 * radix
            } else if (newDigit < 4 * radix) {
              carry = 3
              newDigit -= 3 * radix
            } else if (newDigit < 5 * radix) {
              carry = 4
              newDigit -= 4 * radix
            } else if (newDigit < 6 * radix) {
              carry = 5
              newDigit -= 5 * radix
            } else if (newDigit < 7 * radix) {
              carry = 6
              newDigit -= 6 * radix
            } else {
              carry = 7
              newDigit -= 7 * radix
            }

            digitsOut[i] = newDigit
          }
          if (carry !== 0) digitsOut[i] = carry

          queuedMultiplications -= 3
        } else if (queuedMultiplications > 1 && canMultiplyBy4) {
          let carry = 0, i = 0
          for (; i < digitsOut.length; ++i) {
            let currentDigit = digitsOut[i]
            let newDigit = (currentDigit * 4) + carry

            if (newDigit < radix) {
              carry = 0
            } else if (newDigit < 2 * radix) {
              carry = 1
              newDigit -= radix
            } else if (newDigit < 3 * radix) {
              carry = 2
              newDigit -= 2 * radix
            } else {
              carry = 3
              newDigit -= 3 * radix
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
    }

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
          doMultiplications()

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

    doMultiplications()

    return digitsOut.length === 0 ? [0] : digitsOut
  }

  toString (radix=10) {
    // We *could* convert to base 10, but it's more efficient to convert to base 10^15 and then zero pad and concat
    // the results. That way we can take advantage of the internal, very quick int -> string function

    if (!Number.isInteger(radix) || radix < 2 || radix > 36) throw new RangeError("Base of radix conversion must be an integer between 2 and 36, inclusive.")

    if (radix === 10) {
      const CHUNK_EXPONENT = 15
      const digits = this.toLargeRadixInternal(10 ** CHUNK_EXPONENT)

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
   * Get a 30-bit word starting at a specific bit (which may not be a multiple of 30) where bit 0 is the HIGHEST bit
   */
  getWordAtBit (b) {
    let bc = this.bitCount()
    let offset = bc - b

    if (offset < 0) return 0

    if (offset % BIGINT_WORD_BITS === 0) {

    }



  }

  getWordsAtBit (b, count) {
    let arr = []
    for (let i = 0; i < count; ++i) {
      arr.push(this.getWordAtBit(b))
    }
  }

  /**
   * Convert the bigint to its closest double representation with the given rounding mode. We do this by abstracting a
   * double as basically a number of the form
   *
   *    .... 0 0 0 0 0 1 0 1 0 0 0 0 1 0 1 0 0 1 0 1 0 0 0 1 1 0 0 1 0 0 1 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ....
   *      ...  zeroes |                             53 bits                                  |  zeroes ...
   *
   * The closest number thus begins with the first bit of the integer, wherever that is, then either agrees or disagrees
   * with the rest of the integer. Having constructed the mantissa, we round in the correct direction and multiply by
   * the exponent.
   */
  toNumber (roundingMode) {
    // Example: 17 = 0b10001

    let exponent = this.bitCount() - 1 // bitCount is 5, so the float will be of the form m * 2^4
    let word1 = this.getWordsAtBit(0, 2)
    let word2 = this.getWordAtBit(30)
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
