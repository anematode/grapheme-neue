(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports)
    : typeof define === 'function' && define.amd ? define(['exports'], factory)
      : (global = global || self, factory(global.Grapheme = {}))
}(this, function (exports) {
  'use strict'

  /** The scariest functions. sin, cos, etc. are provided using the built-ins in real_functions.js. */

  /**
   * Returns x + y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   */
  function add (x, y) {
    return x + y
  }

  /**
   * Returns x - y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   */
  function subtract (x, y) {
    return x - y
  }

  /**
   * Returns x * y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   */
  function multiply (x, y) {
    return x * y
  }

  /**
   * Returns x / y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   */
  function divide (x, y) {
    return x / y
  }

  var BasicArithmetic = /* #__PURE__ */Object.freeze({
    add: add,
    subtract: subtract,
    multiply: multiply,
    divide: divide
  })

  // Number of coefficients in the approximation
  const LANCZOS_COUNT = 7
  const LANCZOS_COEFFICIENTS = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ]

  // 1, 1, 2, 6, ...
  const INTEGER_FACTORIALS = [1]

  // Populate INTEGER_FACTORIALS
  let fact = 1
  for (let i = 1; ; ++i) {
    fact *= i

    if (fact === Infinity) { break }

    INTEGER_FACTORIALS.push(fact)
  }

  const INTEGER_FACTORIAL_LEN = INTEGER_FACTORIALS.length

  /**
   * This function accepts a real-valued number x and returns the value of the gamma function evaluated at
   * x. If there is a pole at x, NaN is returned. NaN is returned instead of Infinity to distinguish a pole
   * (at -1, -2, ...) from a massive value (e.g. at 100). The function is relatively accurate and fast, though I
   * would like to assess its accuracy at some point.
   *
   * Handling of special values: NaN -> NaN, Infinity -> Infinity, -Infinity -> NaN
   *
   * The algorithm works based on the Lanczos approximation. The original code was written in Python by
   * Fredrik Johansson and published to Wikipedia, which means it is compatible license-wise with this
   * project. The relevant diff (on the Swedish Wikipedia) is at
   * https://sv.wikipedia.org/w/index.php?title=Gammafunktionen&diff=1146966&oldid=1146894.
   * Values below 0.5 are calculated using the reflection formula, see
   * https://en.wikipedia.org/wiki/Gamma_function#General.
   * @param x {number}
   * @returns {number}
   */
  function gamma (x) {
    // Special cases
    if (Number.isNaN(x)) return NaN
    if (x === Infinity) return Infinity
    if (x === -Infinity) return NaN

    // Define gamma specially for integral values
    if (Number.isInteger(x)) {
      // Gamma function undefined for negative integers
      if (x <= 0) return NaN

      // Gamma function too large, return Infinity
      if (x > INTEGER_FACTORIAL_LEN) return Infinity

      return INTEGER_FACTORIALS[x - 1]
    }

    if (x < 0.5) {
      // Reflection formula
      return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x))
    } else {
      // Lanczos approximation
      x -= 1

      // The value of A_g(x), see https://en.wikipedia.org/wiki/Lanczos_approximation#Introduction
      let z = LANCZOS_COEFFICIENTS[0]
      for (let i = 1; i < LANCZOS_COUNT + 2; ++i) {
        z += LANCZOS_COEFFICIENTS[i] / (x + i)
      }

      const t = x + LANCZOS_COUNT + 0.5
      const sqrt2Pi = Math.sqrt(2 * Math.PI) // for performance, since Math.sqrt can be overwritten

      return sqrt2Pi * Math.pow(t, (x + 0.5)) * Math.exp(-t) * z
    }
  }

  /**
   * The log-gamma or ln-gamma function, commonly used because the gamma function blows up fast and it is
   * useful to work with its larger values. It is just the natural logarithm of the gamma function. The
   * algorithm is identical to the above, except there is no special case for positive integers > 2 (since
   * there is little point, and the list would have to be enormous).
   *
   * Handling of special values: NaN -> NaN, Infinity -> Infinity, -Infinity -> NaN
   *
   * @param x {number}
   * @returns {number}
   */
  function lnGamma (x) {
    // Special cases
    if (Number.isNaN(x)) return NaN
    if (x === Infinity) return Infinity
    if (x === -Infinity) return NaN

    if (x <= 0) {
      // Handle negative numbers
      if (Number.isInteger(x)) return NaN

      // If the floor of x is an odd number, then gamma(x) is negative and thus NaN should be returned.
      if (Math.floor(x) % 2 === 1) return NaN
    }

    // lnGamma(1) = lnGamma(2) = 0; the algorithm is inexact for the former
    if (x === 1 || x === 2) return 0

    if (x < 0.5) {
      // Reflection formula, as above
      const reflected = lnGamma(1 - x)

      const lnPi = Math.log(Math.PI) // for performance, since Math.log can be overwritten

      return lnPi - Math.log(Math.sin(Math.PI * x)) - reflected
    } else {
      // See above for explanation
      x -= 1

      let z = LANCZOS_COEFFICIENTS[0]
      for (let i = 1; i < LANCZOS_COUNT + 2; ++i) {
        z += LANCZOS_COEFFICIENTS[i] / (x + i)
      }

      const t = x + LANCZOS_COUNT + 0.5
      const lnSqrt2Pi = Math.log(2 * Math.PI) / 2 // for performance, since Math.log can be overwritten

      return lnSqrt2Pi + Math.log(t) * (x + 0.5) - t + Math.log(z)
    }
  }

  /**
   * Functions that accept double-precision floating point numbers as arguments.
   * @namespace Grapheme.RealFunctions
   */
  const RealFunctions = {
    ...BasicArithmetic,
    gamma,
    lnGamma
  }

  // List of real functions that will internally use builtin functions from Math
  const mathBuiltinNames = {
    abs: 'abs',
    arccos: 'acos',
    arcosh: 'acosh',
    arcsin: 'asin',
    arsinh: 'asinh',
    arctan: 'atan',
    artanh: 'atanh',
    atan2: 'atan2',
    ceil: 'ceil',
    cbrt: 'cbrt',
    expm1: 'expm1',
    cos: 'cos',
    cosh: 'cosh',
    exp: 'exp',
    floor: 'floor',
    hypot: 'hypot',
    ln: 'log',
    ln1p: 'log1p',
    log2: 'log2',
    log10: 'log10',
    max: 'max',
    min: 'min',
    pow: 'pow',
    round: 'round',
    sign: 'sign',
    sin: 'sin',
    sinh: 'sinh',
    sqrt: 'sqrt',
    tan: 'tan',
    tanh: 'tanh',
    trunc: 'trunc'
  }

  for (const [name, builtin] in Object.values(mathBuiltinNames)) {
    RealFunctions[name] = Math[builtin]
  }

  // Prevent modification of RealFunctions
  Object.freeze(RealFunctions)

  /** Here we define functions for manipulation of double-precision floating point numbers.
   * Some definitions:
   *   special value: ±Infinity and any NaN
   *   normal number: Number which is not ±0 and whose exponent is nonzero
   *   denormal number: Number which is not ±0 and whose exponent is zero
   * */

  /** Check endianness. The functions in this file will not work on big-endian systems, so we need to throw an error.
   * Credit goes to Lucio Pavia on StackOverflow, specifically the answer https://stackoverflow.com/a/52827031/13458117.
   * It is released under CC BY-SA 4.0, which is compatible with this project.
   */
  const isBigEndian = (() => {
    const array = new Uint8Array(4)
    const view = new Uint32Array(array.buffer)
    return !((view[0] = 1) & array[0])
  })()
  if (isBigEndian) throw new Error('Grapheme only works on little-endian systems; your system is mixed- or big-endian.')

  const floatStore = new Float64Array(1)
  const intView = new Uint32Array(floatStore.buffer)

  /**
   * Returns the next floating point number after a positive x, but doesn't account for special cases
   * @param x {number}
   * @returns {number}
   * @private
   */
  function _roundUp (x) {
    floatStore[0] = x

    if (++intView[0] === 4294967296 /* uint32_max + 1 */) ++intView[1]

    return floatStore[0]
  }

  /**
   * Returns the previous floating point number before a POSITIVE x, but doesn't account for special cases
   * roundDown.
   * @param x {number}
   * @returns {number}
   * @private
   */
  function _roundDown (x) {
    floatStore[0] = x

    if (--intView[0] === -1) --intView[1]

    return floatStore[0]
  }

  /**
   * Returns the next floating point number after x. For example, roundUp(0) returns Number.MIN_VALUE.
   * Special cases (±inf, NaNs, 0) are handled separately. An interesting special case is -Number.MIN_VALUE,
   * which would normally return -0 and thus must be handled separately. Then, the float is put into a TypedArray,
   * treated as an integer, and incremented, which sets it to the next representable value. roundUp should
   * NEVER return -0 or -Infinity, but it can accept those. On my computer both these functions take about
   * 20 ns / call (October 2020). They need to be performant because they are called so often (every interval
   * function, pretty much).
   * @param x {number}
   * @returns {number}
   */
  function roundUp (x) {
    // Special cases, where the float representation will mess us up
    if (x === Infinity) return Infinity
    if (x === -Infinity) return -Number.MAX_VALUE
    // since -0 === 0, deals with signed zero
    if (x === 0) return Number.MIN_VALUE
    if (Number.isNaN(x)) return NaN

    // Special case unique to roundUp
    if (x === -Number.MIN_VALUE) return 0

    return (x < 0) ? -_roundDown(-x) : _roundUp(x)
  }

  /**
   * Returns the previous floating point number before x. For example, roundUp(0) returns -Number.MIN_VALUE.
   * See roundUp for implementation explanation. This function should NEVER return -0 or +Infinity, but it
   * can accept those values; roundDown(0) is -Number.MIN_VALUE and roundDown(Infinity) is Number.MAX_VALUE
   * @param x {number}
   * @returns {number}
   */
  function roundDown (x) {
    if (x === Infinity) return Number.MAX_VALUE
    if (x === -Infinity) return -Infinity
    if (x === 0) return -Number.MIN_VALUE
    if (Number.isNaN(x)) return NaN

    return (x < 0) ? -_roundUp(-x) : _roundDown(x)
  }

  // The first positive normal number
  const POSITIVE_NORMAL_MIN = 2.2250738585072014e-308

  // The first negative normal number
  const NEGATIVE_NORMAL_MAX = -POSITIVE_NORMAL_MIN

  /**
   * Return whether a number is denormal; see https://en.wikipedia.org/wiki/Denormal_number. ±0 are not traditionally
   * considered to be denormal numbers. Denormal numbers are sometimes known as subnormal numbers.
   * @param x {number}
   * @returns {boolean}
   */
  function isDenormal (x) {
    return x !== 0 && x < POSITIVE_NORMAL_MIN && x > NEGATIVE_NORMAL_MAX
  }

  var fp_manip = /* #__PURE__ */Object.freeze({
    roundUp: roundUp,
    roundDown: roundDown,
    isDenormal: isDenormal
  })

  /**
   * This file defines interval arithmetic functions.
   * @module RealIntervals
   * */

  /** A real interval is, à la Jeff Tupper's groundbreaking 2001
   * SIGGRAPH paper, a closed interval that is a (not necessarily strict) superset of a set of real numbers. The minimum
   * is stored in the variable min, and the maximum is stored in the variable max. The set of
   * all real numbers can be represented with the interval [-inf, inf]. Tupper also adds four additional properties,
   * here named defMin, defMax, contMin, and contMax. If defMin = defMax = true, then the number represented is entirely
   * DEFINED. If defMin = false and defMax = true, then we are unsure whether the number is defined. If
   * defMin = defMax = false, then the number is definitely undefined.
   *
   * The reason this is useful is to encapsulate the notion of a function being undefined. For example, sqrt([-1, -0.5])
   * is entirely undefined, so defMin = defMax = false. In other words, if x is in [-1, -0.5], we KNOW that sqrt(x) is
   * undefined – at least among the real numbers. But if x is in [-1, 1], we don't know for sure that sqrt(x) is defined,
   * so defMin = false and defMax = true for sqrt([-1, 1]).
   *
   * contMin and contMax are the same thing, but for continuity. Some functions are defined everywhere, but discontinuous.
   * A good example is the floor function. floor([-1, 1]) is always defined, so defMin = defMax = true, but contMin =
   * false and contMax = true. Undefinedness implies discontinuity, not the other way around. That is, if defMin = false,
   * that will take precedence over contMin = true; the value of contMin is immaterial in that case.
   *
   * There is also the class RealIntervalSet, which represents a set of intervals. See that class for more information.
   *
   * In normal Grapheme usage, an undefined RealInterval is simply represented with defMin = defMax = false. null should
   * never be passed to a function as a RealInterval; it will almost certainly throw an error.
   *
   * tl;dr: Six parameters, namely min, max, defMin, defMax, contMin, contMax. min and max are numbers which represent the
   * bounds of the interval, and the remaining four parameters are booleans that provide extra context for the meaning of
   * the interval.
   *
   * @memberof Grapheme
   */
  class RealInterval {
    /**
     * Construct a RealInterval. Only a single argument is needed, and will produce an "exact interval", but there are
     * six arguments in total. The meaning of each argument is described in the class description.
     * @param min {number}
     * @param max {number}
     * @param defMin {boolean}
     * @param defMax {boolean}
     * @param contMin {boolean}
     * @param contMax {boolean}
     */
    constructor (min, max = min, defMin = true, defMax = true, contMin = true, contMax = true) {
      /** {number} */
      this.min = min
      /** {number} */
      this.max = max
      /** {boolean} */
      this.defMin = defMin
      /** {boolean} */
      this.defMax = defMax
      /** {boolean} */
      this.contMin = contMin
      /** {boolean} */
      this.contMax = contMax
    }
  }

  /** Some functions, such as f(x) = 1/x, may
   * have to return wider intervals than ideal for certain inputs. f([-1, 1]) = [-inf, inf, defMin=false, defMin=true],
   * and there is no tighter bound. The solution is to return a SET of intervals, which together cover the solution set.
   * In this case, there would be three (not two) intervals returned. The intervals are [-inf, -1], [1, inf], and
   * [NaN, NaN, defMin=false, defMin=false]. The first two intervals cover the defined possibilities; the last interval
   * covers the fact that 1/0 is undefined.
   *
   * RealIntervalSet is equipped with defMin, defMax, contMin, and contMax functions just like a RealInterval, but they
   * should not be used in performance-intensive situations, because they are getters (which are known to be exceedingly
   * slow). They are calculated; defMin is the logical AND of each interval, and defMax is the logical OR of each
   * interval, and the same is true for contMin and contMax.
   *
   * All exposed interval functions accept both RealIntervals and RealIntervalSets. For performant testing of whether an
   * argument is a RealInterval or Set, the function isSet() can be used. RealIntervalSets CANNOT be nested; they should
   * always be flattened. If a set becomes too fat, it must be MERGED. This can be done in a lossless or lossy fashion.
   * Lossless merging happens when intervals are merged in a way such that the resulting set is exactly equivalent
   * mathematically to the original. For example, [-1, 1] u [1, 4] can be losslessly merged to [-1, 4]. Note that this
   * merging needs to account for differing defMin and defMax values. For example, [-1, 1, defMin=false, defMax=true] u
   * [1, 4, defMin=true, defMax=true] CANNOT be losslessly merged to [-1, 4, defMin=false, defMax=true]; this is a lossy
   * conversion. Obviously, lossless merging is preferred over lossy merging, but the latter might be necessary. In the
   * most extreme case, the interval [-inf, inf, defMin=false, defMax=true, contMin=false, contMax=true] is a valid
   * superset and lossy merge of ANY interval set. The maximum acceptable size for a RealIntervalSet is
   * maxRealIntervalSetSize.
   *
   * As with the RealInterval, an undefined RealIntervalSet is just a RealIntervalSet containing a single undefined
   * RealInterval. */

  exports.FP = fp_manip
  exports.RealFunctions = RealFunctions
  exports.RealInterval = RealInterval

  Object.defineProperty(exports, '__esModule', { value: true })
}))
