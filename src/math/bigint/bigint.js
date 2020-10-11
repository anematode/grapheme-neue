
const digits = '0123456789abcdefghijklmnopqrstuvwxyz'
const base10Verify = /^[0-9]+$/

const BI_WORD_BITS = 30

// Numbers between 0 and this are allowed in a BigInt's words
const MAX_BI_WORD = 2 ** BI_WORD_BITS - 1

// Maximum, stolen from JSBI
const MAX_BI_LENGTH = 1 << 25
const MAX_BI_BITS = MAX_BI_LENGTH * BI_WORD_BITS

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
 * Big integers in JS! I would use the native implementation or JSBI, but I want a pretty customized setup for fast
 * multiplication, division, et cetera. Also, this will be fun.
 *
 * We represent a big-integer with an array of unsigned 30-bit words with the least significant bit at the front, and a
 * sign (-1, 0, or 1). Big-integers are not immutable; they may be modified in-place by any operation
 * containing the phrase "inPlace".
 *
 * As an example, "-45" is represented with { sign: -1, words: [45] }. "-1073741823" is { sign: -1, words: [ 1073741823 ] },
 * while "-1073741824" is { sign: -1, words: [ 0, 1 ]}.
 *
 * "0" is always represented with { sign: 0, words: [] }. This guarantees that there is only one representation for each
 * number. There may be trailing zeroes in the words array.
 */
export class BigInt {
  constructor (words = [], sign = 0) {
    this.words = words
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

    if (radix < 2 || radix > digits.length || !Number.isInteger(radix)) {
      throw new RangeError('Invalid radix')
    }

    str = str.trim()

    return fromString(str, radix)
  }

  wordCount () {
    return this.words.length
  }

  bitCount () {
    const lastElem = this.words[this.wordCount() - 1]

    if (!lastElem) { return 0 }
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

  shiftLeft (num) {
    num = Number(num)

    if (!num) // handles NaN and 0
    { return }

    if (num < 0) { return this.shiftRight(-num) }

    const newWordCount = this
  }

  shiftRight (num) {
    num = Number(num)

    if (!num) // handles NaN and 0
    { return }

    if (num < 0) { return this.shiftLeft(-num) }
  }
}
