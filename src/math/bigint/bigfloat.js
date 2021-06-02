
// A float is composed of a sign (-1, 0, or 1), an exponent between -2^31 and 2^31 - 1, a bit-count precision, and a
// series of 30-bit words containing an integer with prec bits. To be precise, the value of a big float is

// sign * 2 ^ exponent * (1 + (w_0 / 2^30) + (w_1 / 2^30) ... )

// The precision of a BigFloat can be a non-multiple of 30, but it will always be stored in a 30-bit appropriate way.
// NaN is stored via sign = NaN and infinities by sign = -Infinity and Infinity. The precision of a big float is fixed
// at creation. A mantissa of a 40-bit float may look like
//
//   |  100010110100100101010010010101  |  1110101100|00000000000000000000   |
//                  word 1                        word 2, zero padded

import {getExponent, getMantissa, integerExp, pow2} from "../real/fp_manip"
import {ROUNDING_MODE} from "../rounding_modes"

const BIGFLOAT_WORD_BITS = 30
const BIGFLOAT_WORD_SIZE = 2 ** BIGFLOAT_WORD_BITS

function getNeededWords (prec) {
  return Math.ceil(prec / BIGFLOAT_WORD_BITS)
}

function checkValidPrecision (prec) {
  if (!Number.isInteger(prec) || prec < 1 || prec > 1e6) {
    throw new RangeError("Invalid precision")
  }
}

let CURRENT_ROUNDING_MODE = ROUNDING_MODE.NEAREST
let CURRENT_PRECISION = 52

export { CURRENT_ROUNDING_MODE, CURRENT_PRECISION }

export class BigFloat {
  constructor (sign, exponent, precision, mantissa) {
    this.sign = sign
    this.exponent = exponent
    this.prec = precision
    this.mantissa = mantissa
  }

  static fromNumber (val, { precision = CURRENT_PRECISION, rounding = CURRENT_ROUNDING_MODE } = {}) {
    checkValidPrecision(precision)

    let mantissa = new Int32Array(getNeededWords(precision))
    let sign, exponent

    if (!Number.isFinite(val)) {
      sign = val
      exponent = 0
    } else {
      let valExponent = getExponent(val)
      let valMantissa = getMantissa(val)

      let mantissaWord1 = Math.floor(valMantissa / (2 ** 22))
      let mantissaWord2 = ((valMantissa % BIGFLOAT_WORD_SIZE) << 8) & 0x3FFFFFFF

      mantissa[0] = mantissaWord1
      mantissa[1] = mantissaWord2

      exponent = valExponent
      sign = Math.sign(val)
    }

    return new BigFloat(sign, exponent, precision, mantissa)
  }

  static isNaN (f) {
    return Number.isNaN(f.sign)
  }

  static isFinite (f) {
    return Number.isFinite(f.sign)
  }

  /**
   * Spaceship operator between two floats. Returns 0 if the floats are equal (or are both NaN), -1 if f1 is smaller,
   * and 1 if f2 is smaller.
   * @param f1
   * @param f2
   * @returns {number}
   */
  static compare (f1, f2) {
    if (Number.isNaN(f1.sign) || Number.isNaN(f2.sign)) return 0
    if (f1.sign !== f2.sign) {
      if (f1.sign < f2.sign) return -1
      return 1
    }

    if (f1.sign === 0) return 0

    let magnitudeLess = 0

    // We're now left with two non-zero floats of the same sign.
    findMagnitude: if (f1.exponent < f2.exponent) {
      magnitudeLess = -1
    } else if (f1.exponent > f2.exponent) {
      magnitudeLess = 1
    } else {
      // Two non-zero floats with the same exponent. Compare words until one is different
      const f1mantissa = f1.mantissa, f2mantissa = f2.mantissa

      let lastSharedMantissa = Math.min(f1mantissa.length, f2mantissa.length)
      for (let i = 0; i < lastSharedMantissa; ++i) {
        let f1mWord = f1mantissa[i], f2mWord = f2mantissa[i]
        if (f1mWord > f2mWord) {
          magnitudeLess = 1
          break findMagnitude
        } else if (f1mWord < f2mWord) {
          magnitudeLess = -1
          break findMagnitude
        }
      }

      // Need to check for zeros if the mantissas aren't the same length
      if (f1mantissa.length > f2mantissa.length) {
        for (let j = lastSharedMantissa; j < f1mantissa.length; ++j) {
          if (f1mantissa[j] !== 0) magnitudeLess = 1
        }
      } else if (f1mantissa.length < f2mantissa.length) {
        for (let j = lastSharedMantissa; j < f2mantissa.length; ++j) {
          if (f2mantissa[j] !== 0) magnitudeLess = -1
        }
      }
    }

    return magnitudeLess * f1.sign
  }

  toNumber () {
    // We grab the first 52 bits of the mantissa
    let mantissa = this.mantissa[0] * (2 ** 22) + (this.mantissa[1] >> 8)
    let exponent = this.exponent

    return mantissa * pow2(exponent - 52) + pow2(exponent)
  }

  toString () {

  }
}
