
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

const bitmasks = []

for (let i = 0; i < 32; ++i) {
  bitmasks[i] = (1 << i) - 1
}

function getNeededWords (prec) {
  return Math.ceil(prec / BIGFLOAT_WORD_BITS)
}

function checkValidPrecision (prec) {
  if (!Number.isInteger(prec) || prec < 1 || prec > 1e6) {
    throw new RangeError("Invalid precision")
  }
}

function createNaN (prec) {
  return new BigFloat(NaN, 0, prec, new Int32Array(getNeededWords(prec)))
}

function createInfinity (inf) {
  return new BigFloat(Math.sign(inf) * Infinity, 0, prec, new Int32Array(getNeededWords(prec)))
}

/**
 * Shift a mantissa shift bits to the right, into an array with sufficient size for prec bits of precision. The result
 * is not truncated to the given precision, however.
 * @param mantissa {Int32Array}
 * @param shift {number}
 * @param prec {number}
 * @returns {Int32Array}
 */
export function shiftMantissaRight (mantissa, shift, prec) {
  let newMantissa = new Int32Array(prec ? getNeededWords(prec) : mantissa.length)

  let bitShift = shift % 30
  let invShift = 30 - bitShift
  let intermediateMask = bitmasks[bitShift]
  let integerShift = Math.floor(shift / 30)

  for (let i = 0; i < mantissa.length; ++i) {
    newMantissa[i + integerShift] += (mantissa[i] << bitShift) & 0x3FFFFFFF
    newMantissa[i + integerShift + 1] += (mantissa[i] >> invShift) & intermediateMask
  }

  return newMantissa
}

let CURRENT_ROUNDING_MODE = ROUNDING_MODE.NEAREST
let CURRENT_PRECISION = 53

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

      let mantissaWord1 = Math.floor(valMantissa / (1 << 23)) + (1 << 29)
      let mantissaWord2 = ((valMantissa % BIGFLOAT_WORD_SIZE) << 7) & 0x3FFFFFFF

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

  static isZero (f) {
    return f.sign === 0
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
    let mantissa = this.mantissa[0] * (1 << 23) + (this.mantissa[1] >> 7)
    let exponent = this.exponent

    return mantissa * pow2(exponent - 52)
  }

  toString () {

  }

  clone () {
    return new BigFloat(this.sign, this.exponent, this.prec, new Int32Array(this.mantissa))
  }

  static add (f1, f2, { precision = CURRENT_PRECISION, rounding = CURRENT_ROUNDING_MODE } = {}) {
    // Handle 0s, infs, NaNs
    if (!Number.isFinite(f1.sign) || !Number.isFinite(f2.sign)) {
      if (Number.isNaN(f1.sign + f2.sign)) {
        return createNaN(precision) // NaN + x, x + NaN, -Infinity + Infinity
      } else {
        return createInfinity(f1.sign + f2.sign)
      }
    } else if (f1.sign === 0) {
      return f2.clone()
    } else if (f2.sign === 0) {
      return f1.clone()
    }

    // Give f1 the larger exponent
    if (f2.exponent > f1.exponent) {
      [ f1, f2 ] = [ f2, f1 ]
    }

    let f1exp = f1.exponent, f2exp = f2.exponent, f1mant = f1.mantissa, f2mant = f2.mantissa, f1prec = f1.precision,
      f2prec = f2.precision
    const f1mantEnd = f1exp + f1prec - 1, f2mantEnd = f2exp + f2prec - 1

    // Initialize out with the f1 mantissa. If there's a carry, we'll have to shift and increment the exponent
    let outMantissa = new Int32Array(getNeededWords(precision))
    outMantissa.set(f1mant)

    // The bits of f1 span from f1exp to f1exp + f1prec - 1, inclusive. We iterate through the words of f2, *shifted* so
    // that they line up with the 30-bit words of f1, and add.
    const bitshift = (f1exp - f2exp) % 30
    const intermediateMask = bitmasks[bitshift]
    const invshift = 30 - bitshift

    console.log(bitshift)

    const integerShift = Math.floor((f1exp - f2exp) / 30)
    let hasCarries = false

    for (let i = f2mant.length - 1; i >= 0; --i) {
      let word = (f2mant[i] >> bitshift)
      if (i > 0) word += (f2mant[i - 1] & intermediateMask) << invshift

      if ((outMantissa[i + integerShift] += word) >= BIGFLOAT_WORD_SIZE) {
        hasCarries = true
      }
    }

    console.log(outMantissa)

    let carry = 0

    // Do carries
    if (hasCarries) {
      for (let i = outMantissa.length - 1; i >= 0; --i) {
        let word = outMantissa[i] + carry

        if (word >= BIGFLOAT_WORD_SIZE) {
          word -= BIGFLOAT_WORD_SIZE
          carry = 1

          outMantissa[i] = word
        } else {
          outMantissa[i] = word
          carry = 0
        }
      }
    }

    if (carry === 1) {
      f1exp += 1

      console.log(outMantissa)

      outMantissa = shiftMantissaRight(outMantissa, 1, precision)
      //outMantissa[0] += 2 ** 29
    }

    return new BigFloat(1, f1exp, precision, outMantissa)
  }
}
