
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

    if (isDenormal(num)) {

    }

    const outMantissa = getMantissaForPrecision(precision)

    let valExponent = getExponent(num)
    let valMantissa = getMantissa(num)

    // Exponent of the float (2^30)^newExp
    let newExp = Math.ceil((valExponent + 1) / BIGFLOAT_WORD_BITS)

    // The mantissa needs to be shifted to the right by this much. 0 < bitshift <= 30
    let bitshift = newExp * BIGFLOAT_WORD_BITS - valExponent

    let denom = pow2(bitshift + 22)
    outMantissa[0] = Math.floor(valMantissa / denom) /* from double */ + (1 << (30 - bitshift)) /* add 1 */

    let rem = valMantissa % denom
    if (rem > BIGFLOAT_WORD_MAX) {
      let cow = 1 << (bitshift - 8)

      outMantissa[1] = Math.floor(rem / cow)
      outMantissa[2] = (rem % cow) << (38 - bitshift)
    } else {
      console.log(leftZeroPad(outMantissa[0].toString(2), 30, 'X'), leftZeroPad(valMantissa.toString(2), 30, 'X'), leftZeroPad(rem.toString(2), 30, 'X'))
      console.log(bitshift)
      outMantissa[1] = rem << (8 - bitshift)
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

  toNumber () {
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
