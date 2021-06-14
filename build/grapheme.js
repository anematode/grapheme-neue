(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Grapheme = {}));
}(this, (function (exports) { 'use strict';

  /**
   * @file This file defines functions for bit-level manipulation of double-precision floating point numbers. More
   * information can be found in Grapheme Theory.
   */

  /**
   * Check endianness. The functions in this file will not work on big-endian systems, so we need to throw an error if that is the case.
   * Credit goes to Lucio Pavia on StackOverflow, specifically {@link https://stackoverflow.com/a/52827031/13458117|this answer}.
   * It is released under CC BY-SA 4.0, which is compatible with this project.
   * @ignore
   */
  const isBigEndian = (() => {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
  })();

  if (isBigEndian) throw new Error('only works on little-endian systems; your system is mixed- or big-endian.'); // Used for bit-level manipulation of floats

  const floatStore = new Float64Array(1);
  const intView = new Uint32Array(floatStore.buffer);
  /**
   * Returns the next floating point number after a positive x, but doesn't account for special cases.
   * @param x {number}
   * @returns {number}
   * @private
   */

  function _roundUp(x) {
    floatStore[0] = x;
    if (++intView[0] === 4294967296
    /* uint32_max + 1 */
    ) ++intView[1];
    return floatStore[0];
  }
  /**
   * Returns the previous floating point number before a positive x, but doesn't account for special cases.
   * @param x {number}
   * @returns {number}
   * @private
   */


  function _roundDown(x) {
    floatStore[0] = x;
    if (--intView[0] === -1) --intView[1];
    return floatStore[0];
  }
  /**
   * Returns the next floating point number after x. For example, roundUp(0) returns Number.MIN_VALUE.
   * Special cases (±inf, NaNs, 0) are handled separately. (An interesting special case is -Number.MIN_VALUE,
   * which would normally return -0 and thus must be handled separately.) Then, the float is put into a TypedArray,
   * treated as an integer, and incremented, which sets it to the next representable value. roundUp should
   * NEVER return -0 or -Infinity, but it can accept those values. On my computer both these functions take about
   * 20 ns / call (October 2020). They need to be performant because they are called very often (every interval
   * function, pretty much).
   * @param x {number} Any floating-point number
   * @returns {number} The next representable floating-point number, handling special cases
   * @function roundUp
   * @memberOf FP
   */


  function roundUp(x) {
    // Special cases, where the float representation will mess us up
    if (x === Infinity) return Infinity;
    if (x === -Infinity) return -Number.MAX_VALUE; // since -0 === 0, deals with signed zero

    if (x === 0) return Number.MIN_VALUE;
    if (Number.isNaN(x)) return NaN; // Special case unique to roundUp

    if (x === -Number.MIN_VALUE) return 0;
    return x < 0 ? -_roundDown(-x) : _roundUp(x);
  }
  /**
   * Returns the previous floating point number before x. For example, roundUp(0) returns -Number.MIN_VALUE.
   * See {@link FP.roundUp} for implementation explanation. This function should NEVER return -0 or
   * +Infinity, but it can accept those values; roundDown(0) is -Number.MIN_VALUE and roundDown(Infinity) is
   * Number.MAX_VALUE.
   * @param x {number} Any floating-point number
   * @returns {number} The previous representable floating-point number, handling special cases
   * @function roundDown
   * @memberOf FP
   */

  function roundDown(x) {
    if (x === Infinity) return Number.MAX_VALUE;
    if (x === -Infinity) return -Infinity;
    if (x === 0) return -Number.MIN_VALUE;
    if (Number.isNaN(x)) return NaN;
    return x < 0 ? -_roundUp(-x) : _roundDown(x);
  } // The first positive normal number

  const POSITIVE_NORMAL_MIN = 2.2250738585072014e-308; // The first negative normal number

  const NEGATIVE_NORMAL_MAX = -POSITIVE_NORMAL_MIN;
  /**
   * Return whether a number is denormal; see {@link https://en.wikipedia.org/wiki/Denormal_number|Wikipedia} for a
   * technical explanation of what this means. ±0 are not considered denormal numbers. Denormal numbers are sometimes
   * known as subnormal numbers.
   * @param x {number} Any floating-point number
   * @returns {boolean} Whether the number is a denormal number
   * @function isDenormal
   * @memberOf FP
   */

  function isDenormal(x) {
    // Note that NaN will return false, since NaN < anything is false.
    return x !== 0 && x < POSITIVE_NORMAL_MIN && x > NEGATIVE_NORMAL_MAX;
  }
  /**
   * Get the non-biased exponent of a floating-point number x. Equivalent mathematically to floor(log2(abs(x))) for
   * finite values, but more accurate as the precision of log2 is not technically guaranteed. My tests on Chrome suggest
   * that it is actually twice as fast as floor(log2(...)), which is surprising; the culprit is likely the log2 function,
   * which must calculate to full precision before being floored.
   * @param x {number} Any floating-point number
   * @returns {number} The non-biased exponent of that number's floating-point representation
   * @function getExponent
   * @memberOf FP
   */

  function getExponent(x) {
    floatStore[0] = x; // Mask the biased exponent, retrieve it and convert it to non-biased

    return ((intView[1] & 0x7ff00000) >> 20) - 1023;
  } // Internal function

  function _getMantissaHighWord() {
    return intView[1] & 0x000fffff;
  }
  /**
   * Get the mantissa of a floating-point number as an integer in [0, 2^52).
   * @param x {number} Any floating-point number
   * @returns {number} An integer in [0, 2^52) containing the mantissa of that number
   * @function getMantissa
   * @memberOf FP
   */


  function getMantissa(x) {
    floatStore[0] = x;
    return intView[0] + _getMantissaHighWord() * 4294967296;
  }
  /**
   * Testing function counting the approximate number of floats between x1 and x2, including x1 but excluding x2. NaN if
   * either is undefined. It is approximate because the answer may sometimes exceed Number.MAX_SAFE_INTEGER, but it is
   * exact if the answer is less than Number.MAX_SAFE_INTEGER.
   * @param x1 {number} The lesser number
   * @param x2 {number} The greater number
   * @returns {number} The number of floats in the interval [x1, x2)
   * @function getExponent
   * @memberOf FP
   */

  function countFloatsBetween(x1, x2) {
    if (Number.isNaN(x1) || Number.isNaN(x2)) {
      return NaN;
    }

    if (x1 === x2) return 0;

    if (x2 < x1) {
      const tmp = x1;
      x1 = x2;
      x2 = tmp;
    }

    const [x1man, x1exp] = frExp(x1);
    const [x2man, x2exp] = frExp(x2);
    return (x2man - x1man) * 2 ** 53 + (x2exp - x1exp) * 2 ** 52;
  }
  /**
   * Calculates 2 ^ exp, using a customized method for integer exponents. An examination of V8's pow function didn't
   * reveal any special handling, and indeed my benchmark indicates this method is 3 times faster than pow for integer
   * exponents. Note that bit shifts can't really be used except for a restricted range of exponents.
   * @param exp {number} Exponent; intended for use with integers, but technically works with any floating-point number.
   * @returns {number} Returns 2 ^ exp, and is guaranteed to be exact for integer exponents.
   * @function pow2
   * @memberOf FP
   */

  function pow2(exp) {
    if (!Number.isInteger(exp)) return Math.pow(2, exp);
    if (exp > 1023) return Infinity;
    if (exp < -1074) return 0;

    if (exp < -1022) {
      // Works because of JS's insane casting systems
      const field = 1 << exp + 1074;

      if (exp > -1043) {
        // denormalized case 1
        intView[0] = 0;
        intView[1] = field;
      } else {
        // case 2
        intView[0] = field;
        intView[1] = 0;
      }
    } else {
      intView[0] = 0;
      intView[1] = exp + 1023 << 20;
    }

    return floatStore[0];
  } // Counts the number of trailing zeros in a 32-bit integer n; similar to <i>Math.clz32</i>.

  function countTrailingZeros(n) {
    let bits = 0;

    if (n !== 0) {
      let x = n; // Suck off groups of 16 bits, then 8 bits, et cetera

      if ((x & 0x0000FFFF) === 0) {
        bits += 16;
        x >>>= 16;
      }

      if ((x & 0x000000FF) === 0) {
        bits += 8;
        x >>>= 8;
      }

      if ((x & 0x0000000F) === 0) {
        bits += 4;
        x >>>= 4;
      }

      if ((x & 0x00000003) === 0) {
        bits += 2;
        x >>>= 2;
      }

      bits += x & 1 ^ 1;
    } else {
      return 32;
    }

    return bits;
  } // Internal function


  function _mantissaCtz() {
    const bits = countTrailingZeros(intView[0]);

    if (bits === 32) {
      const secondWordCount = countTrailingZeros(_getMantissaHighWord());
      return 32 + Math.min(secondWordCount, 20);
    }

    return bits;
  }
  /**
   * Counts the number of trailing zeros in the mantissa of a floating-point number, between 0 and 52.
   * @param d {number} A floating-point number
   * @returns {number} The number of trailing zeros in that number's mantissa
   * @function mantissaCtz
   * @memberOf FP
   */


  function mantissaCtz(d) {
    floatStore[0] = d;
    return _mantissaCtz();
  } // Internal function

  function _mantissaClz() {
    const bits = Math.clz32(_getMantissaHighWord()) - 12; // subtract the exponent zeroed part

    return bits !== 20 ? bits : bits + Math.clz32(intView[0]);
  }
  /**
   * Counts the number of leading zeros in the mantissa of a floating-point number, between 0 and 52.
   * @param d {number} A floating-point number
   * @returns {number} The number of leading zeros in that number's mantissa
   * @function mantissaClz
   * @memberOf FP
   */


  function mantissaClz(d) {
    floatStore[0] = d;
    return _mantissaClz();
  }
  /**
   * Converts a floating-point number into a fraction in [0.5, 1) or (-1, -0.5], except special cases, and an exponent,
   * such that fraction * 2 ^ exponent gives the original floating point number. If x is ±0, ±Infinity or NaN, [x, 0] is
   * returned to maintain this guarantee.
   * @param x {number} Any floating-point number
   * @returns {number[]} [fraction, exponent]
   * @function frExp
   * @memberOf FP
   */

  function frExp(x) {
    if (x === 0 || !Number.isFinite(x)) return [x, 0]; // +1 so that the fraction is between 0.5 and 1 instead of 1 and 2

    let exp = getExponent(x) + 1; // Denormal

    if (exp === -1022) {
      // If the mantissa is the integer m, then we should subtract clz(m) from exp to get a suitable answer
      exp -= _mantissaClz();
    }

    return [x / pow2(exp), exp];
  }
  /**
   * Converts a floating-point number into a numerator, denominator and exponent such that it is equal to n/d * 2^e. n and
   * d are guaranteed to be less than or equal to 2^53 and greater than or equal to 0 (unless the number is ±0, Infinity,
   * or NaN, at which point [x, 1, 0] is returned). See Grapheme Theory for details.
   * @param x {number} Any floating-point number
   * @returns {number[]} [numerator, denominator, exponent]
   * @function rationalExp
   * @memberOf FP
   */

  function rationalExp(x) {
    if (x < 0) {
      const [num, den, exp] = rationalExp(-x);
      return [-num, den, exp];
    }

    if (x === 0 || !Number.isFinite(x)) return [x, 1, 0]; // Decompose into frac * 2 ^ exp

    const [frac, exp] = frExp(x); // This tells us the smallest power of two which frac * (2 ** shift) is an integer, which is the denominator
    // of the dyadic rational corresponding to x

    const den = pow2(53 - mantissaCtz(frac));
    const num = frac * den;
    return [num, den, exp];
  }

  var fp_manip = /*#__PURE__*/Object.freeze({
    __proto__: null,
    floatStore: floatStore,
    intView: intView,
    roundUp: roundUp,
    roundDown: roundDown,
    isDenormal: isDenormal,
    getExponent: getExponent,
    getMantissa: getMantissa,
    countFloatsBetween: countFloatsBetween,
    pow2: pow2,
    mantissaCtz: mantissaCtz,
    mantissaClz: mantissaClz,
    frExp: frExp,
    rationalExp: rationalExp
  });

  let id = 0;
  /** Returns a single unique positive integer */

  function getID() {
    return ++id;
  }
  function benchmark(callback, iterations = 100, output = console.log) {
    const start = performance.now();

    for (let i = 0; i < iterations; ++i) {
      callback();
    }

    const duration = performance.now() - start;
    output("Function ".concat(callback.name, " took ").concat(duration / iterations, " ms") + (iterations === 1 ? '.' : ' per call.'));
  }
  function time(callback, output = console.log) {
    const start = performance.now();
    let result = 'finished';

    try {
      callback();
    } catch (e) {
      result = 'threw';
      throw e;
    } finally {
      output("Function ".concat(callback.name, " ").concat(result, " in ").concat(performance.now() - start, " ms."));
    }
  }
  function assertRange(num, min, max, variableName = 'Unknown variable') {
    if (num < min || num > max || Number.isNaN(num)) {
      throw new RangeError("".concat(variableName, " must be in the range [").concat(min, ", ").concat(max, "]"));
    }
  }
  function isPrimitive(obj) {
    return typeof obj === 'object' && obj !== null;
  } // Generate an id of the form xxxx-xxxx
  // TODO: guarantee no collisions via LFSR or something similar

  function getStringID() {
    function randLetter() {
      return String.fromCharCode(Math.round(Math.random() * 25 + 96));
    }

    function randFourLetter() {
      return randLetter() + randLetter() + randLetter() + randLetter();
    }

    return randFourLetter() + '-' + randFourLetter();
  } // Simple deep equals. Uses Object.is-type equality, though. Doesn't handle circularity or any of the fancy new containers

  function deepEquals(x, y) {
    if (typeof x !== "object" || x === null) return Object.is(x, y);
    if (x.constructor !== y.constructor) return false;

    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) return false;

      for (let i = x.length - 1; i >= 0; --i) {
        if (!deepEquals(x[i], y[i])) return false;
      }

      return true;
    } // The only other thing of consequence to us. Could probably handle other weird objects too, but meh.


    if (ArrayBuffer.isView(x) && ArrayBuffer.isView(y)) {
      if (x.length !== y.length) return false;

      if (x instanceof Float32Array || x instanceof Float64Array) {
        for (let i = x.length - 1; i >= 0; --i) {
          const xv = x[i]; // What a beautiful way to test for same valueness between floats!

          if (xv !== y[i] && !(xv !== xv && y[i] !== y[i]) || xv === 0 && 1 / xv !== 1 / y[i]) return false;
        }
      } else {
        for (let i = x.length - 1; i >= 0; --i) {
          if (x[i] !== y[i]) return false;
        }
      }

      return true;
    }

    if (x instanceof Map || x instanceof Set) return false; // Just in case
    // x and y are just objects

    const keys = Object.keys(x);
    if (Object.keys(y).length !== keys.length) return false;

    for (const key of keys) {
      // fails if y is Object.create(null)
      if (!y.hasOwnProperty(key)) return false;
      if (!deepEquals(x[key], y[key])) return false;
    }

    return true;
  }
  function isTypedArray(arr) {
    return ArrayBuffer.isView(arr) && !(arr instanceof DataView);
  }
  function mod(n, m) {
    return (n % m + m) % m;
  }

  var utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getID: getID,
    benchmark: benchmark,
    time: time,
    assertRange: assertRange,
    isPrimitive: isPrimitive,
    getStringID: getStringID,
    deepEquals: deepEquals,
    isTypedArray: isTypedArray,
    mod: mod
  });

  /**
   * @file Basic functions for common operations on floating-point numbers.
   */

  /**
   * Returns x + y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   * @function add
   * @memberOf RealFunctions
   */
  function add(x, y) {
    return x + y;
  }
  /**
   * Returns x - y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   * @function subtract
   * @memberOf RealFunctions
   */

  function subtract(x, y) {
    return x - y;
  }
  /**
   * Returns x * y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   * @function multiply
   * @memberOf RealFunctions
   */

  function multiply(x, y) {
    return x * y;
  }
  /**
   * Returns x / y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   * @function divide
   * @memberOf RealFunctions
   */

  function divide(x, y) {
    return x / y;
  }
  /**
   * Returns the greatest common divisor of a and b. Uses the Euclidean algorithm. Returns NaN if one of them is not an
   * integer, and the non-zero argument if one of them is zero (0 if both are zero).
   * @param a {number}
   * @param b {number}
   * @returns {number}
   * @function gcd
   * @memberOf RealFunctions
   */

  function gcd(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b)) return NaN;
    a = Math.abs(a);
    b = Math.abs(b);

    if (a === 0) {
      return b;
    }

    if (b === 0) {
      return a;
    }

    if (b > a) {
      const tmp = a;
      a = b;
      b = tmp;
    }

    while (true) {
      if (b === 0) {
        return a;
      }

      a %= b;

      if (a === 0) {
        return b;
      }

      b %= a;
    }
  }

  /**
   * @file This file implements the gamma function and related functions, though not to least-significant-bit accuracy.
   */
  // Lanczos approximation data
  const LANCZOS_COUNT = 7;
  const LANCZOS_COEFFICIENTS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; // 1, 1, 2, 6, ...

  const INTEGER_FACTORIALS = [1]; // Populate INTEGER_FACTORIALS

  let fact = 1;

  for (let i = 1;; ++i) {
    fact *= i;

    if (fact === Infinity) {
      break;
    }

    INTEGER_FACTORIALS.push(fact);
  }

  const INTEGER_FACTORIAL_LEN = INTEGER_FACTORIALS.length;
  /**
   * This function accepts a real-valued number x and returns the value of the gamma function evaluated at
   * x. If there is a pole at x, NaN is returned. NaN is returned instead of Infinity to distinguish a pole
   * (at -1, -2, ...) from a massive value (e.g. at 100). The function is relatively accurate and fast, though I
   * would like to assess its accuracy at some point.
   * <br>
   * The algorithm works based on the Lanczos approximation. The original code was written in Python by
   * Fredrik Johansson and published to Wikipedia, which means it is compatible license-wise with this
   * project. The relevant diff (on the Swedish Wikipedia) is at
   * {@link https://sv.wikipedia.org/w/index.php?title=Gammafunktionen&diff=1146966&oldid=1146894}.
   * Values below 0.5 are calculated using the reflection formula, see
   * {@link https://en.wikipedia.org/wiki/Gamma_function#General}.
   * @param x {number} The argument to the gamma function
   * @returns {number} gamma(x), approximately
   * @function gamma
   * @memberOf RealFunctions
   */

  function gamma(x) {
    // Special cases
    if (Number.isNaN(x)) return NaN;
    if (x === Infinity) return Infinity;
    if (x === -Infinity) return NaN; // Define gamma specially for integral values

    if (Number.isInteger(x)) {
      // Gamma function undefined for negative integers
      if (x <= 0) return NaN; // Gamma function too large, return Infinity

      if (x > INTEGER_FACTORIAL_LEN) return Infinity;
      return INTEGER_FACTORIALS[x - 1];
    }

    if (x < 0.5) {
      // Reflection formula
      return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
    } else {
      // Lanczos approximation
      x -= 1; // The value of A_g(x), see https://en.wikipedia.org/wiki/Lanczos_approximation#Introduction

      let z = LANCZOS_COEFFICIENTS[0];

      for (let i = 1; i < LANCZOS_COUNT + 2; ++i) {
        z += LANCZOS_COEFFICIENTS[i] / (x + i);
      }

      const t = x + LANCZOS_COUNT + 0.5;
      const sqrt2Pi = Math.sqrt(2 * Math.PI); // for performance, since Math.sqrt can be overwritten

      return sqrt2Pi * Math.pow(t, x + 0.5) * Math.exp(-t) * z;
    }
  }
  /**
   * The factorial of x. This function accepts all numerical values and just internally uses the gamma function.
   * @param x {number} The argument to the factorial function
   * @returns {number} factorial(x), approximately (but exact if possible for integer x)
   * @function factorial
   * @memberOf RealFunctions
   */

  function factorial(x) {
    return gamma(x + 1);
  }
  /**
   * The log-gamma or ln-gamma function, commonly used because the gamma function blows up fast and it is
   * useful to work with its larger values. It is just the natural logarithm of the gamma function. The
   * algorithm is identical to the above, except there is no special case for positive integers > 2 (since
   * there is little point, and the list would have to be enormous).
   * <br>
   * Handling of special values: NaN -> NaN, Infinity -> Infinity, -Infinity -> NaN
   * @param x {number} The argument to the lnGamma function
   * @returns {number} lnGamma(x), approximately
   * @function lnGamma
   * @memberOf RealFunctions
   */

  function lnGamma(x) {
    // Special cases
    if (Number.isNaN(x)) return NaN;
    if (x === Infinity) return Infinity;
    if (x === -Infinity) return NaN;

    if (x <= 0) {
      // Handle negative numbers
      if (Number.isInteger(x)) return NaN; // If the floor of x is an odd number, then gamma(x) is negative and thus NaN should be returned.

      if (Math.floor(x) % 2 === 1) return NaN;
    } // lnGamma(1) = lnGamma(2) = 0; the algorithm is inexact for the former


    if (x === 1 || x === 2) return 0;

    if (x < 0.5) {
      // Reflection formula, as above
      const reflected = lnGamma(1 - x);
      const lnPi = Math.log(Math.PI); // for performance, since Math.log can be overwritten

      return lnPi - Math.log(Math.sin(Math.PI * x)) - reflected;
    } else {
      // See above for explanation
      x -= 1;
      let z = LANCZOS_COEFFICIENTS[0];

      for (let i = 1; i < LANCZOS_COUNT + 2; ++i) {
        z += LANCZOS_COEFFICIENTS[i] / (x + i);
      }

      const t = x + LANCZOS_COUNT + 0.5;
      const lnSqrt2Pi = Math.log(2 * Math.PI) / 2; // for performance, since Math.log can be overwritten

      return lnSqrt2Pi + Math.log(t) * (x + 0.5) - t + Math.log(z);
    }
  }

  /**
   * @file This file allows floating-point numbers to be recognized consistently as rational or irrational, with a
   * customizable error rate.
   */
  /**
   * Return the closest rational number p/q to x where 1 <= q <= maxDenominator and |p| <= maxNumerator. The algorithm is
   * described in Grapheme Theory, but the basic idea is that we express the given floating-point number as an exact
   * fraction, then expand its continued fraction and use it to find the best approximation.
   * @param x {number} The number to find rational numbers near
   * @param maxDenominator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
   * @param maxNumerator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
   * @returns {number[]} A three-element array [ p, q, error ], where error is abs(x - p/q) as calculated by JS
   */

  function closestRational(x, maxDenominator, maxNumerator = Number.MAX_SAFE_INTEGER) {
    if (x < 0) {
      const [p, q, error] = closestRational(-x, maxDenominator, maxNumerator);
      return [-p, q, error];
    }

    assertRange(maxDenominator, 1, Number.MAX_SAFE_INTEGER, 'maxDenominator');
    assertRange(maxNumerator, 1, Number.MAX_SAFE_INTEGER, 'maxNumerator'); // Make integers

    maxDenominator = Math.round(maxDenominator);
    maxNumerator = Math.round(maxNumerator); // Some simple cases

    if (!Number.isFinite(x)) {
      return [NaN, NaN, NaN];
    }

    if (Number.isInteger(x)) {
      if (x <= maxNumerator) {
        return [x, 1, 0];
      }
    } else if (maxDenominator === 1) {
      const rnd = Math.min(maxNumerator, Math.round(x));
      return [rnd, 1, Math.abs(rnd - x)];
    }

    if (x > maxNumerator) {
      // Closest we can get, unfortunately
      return [maxNumerator, 1, Math.abs(maxNumerator - x)];
    } // Floor and fractional part of x


    const flr = Math.floor(x); // Guaranteed to be in (0, 1) and to be exact

    const frac = x - flr; // frac = exactFracNum / (exactFracDenWithoutExp * 2 ^ exp) = exactN / exactD (last equality is by definition); exp >= 0 guaranteed

    const [exactFracNum, exactFracDenWithoutExp, expN] = rationalExp(frac);
    const exp = -expN; // exactFracDen = exactD; exactFracNum = exactN. Note that x * 2^n is always exactly representable, so exactFracDen
    // is exact even though it may be greater than MAX_SAFE_INTEGER. Occasionally, this will overflow to Infinity, but
    // that is okay; we just return 0.

    const exactFracDen = exactFracDenWithoutExp * pow2(exp);
    if (exactFracDen === Infinity) return [0, 1, x]; // We express frac as a continued fraction. To do this, we start with the definition that frac = exactN/exactD.
    // Then frac = 0 + 1 / (floor(exactD/exactN) + 1 / (exactN / mod(exactD,exactN))). Note that
    // the term mod(eD,eN) / eN is always representable exactly, since eN <= MAX_SAFE_INTEGER, and the rest of the
    // continued fraction can be evaluated. The calculation of floor(exactD/exactN) is troublesome given that exactD may
    // be greater than Number.MAX_SAFE_INTEGER, and that the calculation MUST be exact. What may indeed happen is that
    // exactD/exactN will have a value below an integer, but close to that integer, and then will round to that integer.
    // We get around this by using the calculated value for modDN, which IS exact, to nudge it towards the real answer.
    // Eventually I will prove this will always work, but it's worth pointing out that if the quotient is MASSIVE so that
    // the nudging makes no difference, then a small error doesn't matter because the convergent will be too big for
    // consideration anyway.

    const modDN = exactFracDen % exactFracNum;
    const flrDN = Math.round(exactFracDen / exactFracNum - modDN / exactFracNum);
    let contFracGeneratorNum = exactFracNum;
    let contFracGeneratorDen = modDN; // Define a recursive function d(i+1) = c_(i+1) * d(i) + d(i-1), where c_i is the ith term (indexed from 1) of the
    // continued fraction, as well as n(i+1) = c_(i+1) * n(i) + n(i-1). Then n(i+1) / d(i+1) is indeed the (i+1)th
    // convergent of the continued fraction. Thus, we store the previous two numerators and denominators, which is all we
    // need to calculate the next convergent.
    // n_(i-1), n_i, d_(i-1), d_i, starting at i = 1

    let nnm1 = 1;
    let nn = flr;
    let dnm1 = 0;
    let dn = 1; // Store the best numerators and denominators found so far

    let bestN = Math.round(x);
    let bestD = 1; // Same indexing variable as Grapheme Theory. In case there's a bug I don't know about; it should terminate in < 55 steps

    for (let i = 2; i < 100; ++i) {
      // term is equivalent to c_i from Grapheme theory
      let term, rem;

      if (i !== 2) {
        // All steps besides the first
        term = Math.floor(contFracGeneratorNum / contFracGeneratorDen);
        rem = contFracGeneratorNum % contFracGeneratorDen;
        contFracGeneratorNum = contFracGeneratorDen;
        contFracGeneratorDen = rem;
      } else {
        // The first step is special, since we have already specially computed these values
        term = flrDN;
        rem = modDN;
      } // nnp1 and dnp1 are equivalent to Grapheme Theory's n_i and d_i


      let nnp1 = term * nn + nnm1;
      let dnp1 = term * dn + dnm1; // Having computed the next convergent, we see if it meets our criteria. If it does not, we see whether a reduction
      // of that convergent can produce a fraction of better accuracy. If that is so, we return this reduced
      // value; otherwise, we return bestN/bestD, which we know to be a valid (and best possible) approximation.

      if (nnp1 <= maxNumerator && dnp1 <= maxDenominator) {
        bestN = nnp1;
        bestD = dnp1;
      } else {
        // Check for reduced. term_r is a valid reduction if term_reduced > term / 2 (except for a special case
        // which we'll deal with shortly) and the resulting values of nnp1 and dnp1 are within bounds. Thus,
        // term_r * nn + nnm1 <= maxNumerator and term_r * dn + dnm1 <= maxDenominator. Some finagling results in
        // term_r <= (maxNumerator - nnm1) / nn and term_r <= (maxDenominator - dnm1) / dn, thus we have our final ineq,
        // term / 2 < term_r <= Math.min((maxNumerator - nnm1) / nn, (maxDenominator - dnm1) / dn).
        const maxTermR = Math.floor(Math.min((maxNumerator - nnm1) / nn, (maxDenominator - dnm1) / dn));
        const minTermR = term / 2;

        if (maxTermR >= minTermR) {
          // reduced semiconvergent (maybe) possible
          nnp1 = maxTermR * nn + nnm1;
          dnp1 = maxTermR * dn + dnm1;

          if (maxTermR > minTermR) {
            bestN = nnp1;
            bestD = dnp1;
          } else {
            // rare special case. We check whether bestN/bestD is a BETTER convergent than this, and select the better one.
            const reduced = nnp1 / dnp1;
            const oldBest = bestN / bestD;

            if (Math.abs(reduced - x) < Math.abs(oldBest - x)) {
              bestN = nnp1;
              bestD = dnp1;
            }
          }
        }

        break;
      }

      if (rem === 0) break; // Store history of values

      nnm1 = nn;
      nn = nnp1;
      dnm1 = dn;
      dn = dnp1;
    }

    const quot = bestN / bestD;
    return [bestN, bestD, Math.abs(quot - x)];
  } // [...Array(53 + 25).keys()].map(n => { n = n - 52; return Math.floor(Math.min(Math.PI * 2 ** (26 - n/2) / 300, Number.MAX_SAFE_INTEGER)) })

  const dnLookupTable = [47161585013522, 33348276574567, 23580792506761, 16674138287283, 11790396253380, 8337069143641, 5895198126690, 4168534571820, 2947599063345, 2084267285910, 1473799531672, 1042133642955, 736899765836, 521066821477, 368449882918, 260533410738, 184224941459, 130266705369, 92112470729, 65133352684, 46056235364, 32566676342, 23028117682, 16283338171, 11514058841, 8141669085, 5757029420, 4070834542, 2878514710, 2035417271, 1439257355, 1017708635, 719628677, 508854317, 359814338, 254427158, 179907169, 127213579, 89953584, 63606789, 44976792, 31803394, 22488396, 15901697, 11244198, 7950848, 5622099, 3975424, 2811049, 1987712, 1405524, 993856, 702762, 496928, 351381, 248464, 175690, 124232, 87845, 62116, 43922, 31058, 21961, 15529, 10980, 7764, 5490, 3882, 2745, 1941, 1372, 970, 686, 485, 343, 242, 171, 121]; // Internal function used to convert a double to a rational; does the actual work.

  function _doubleToRational(d) {
    if (d === 0) {
      return [0, 1];
    } else if (Number.isInteger(d)) {
      return [d, 1];
    }

    const negative = d < 0;
    d = Math.abs(d); // Early exit conditions

    if (d <= 1.1102230246251565e-16
    /** 2^-53 */
    || d > 67108864
    /** 2^26 */
    || !Number.isFinite(d)) {
      return [NaN, NaN];
    } // Guaranteed that d > 0 and is finite, and that its exponent n is in the range [-52, 25] inclusive.


    const exp = getExponent(d); // We now look up the corresponding value of d_n, as explained in Grapheme Theory. It is offset by 52 because arrays
    // start from 0

    const dn = dnLookupTable[exp + 52]; // We find the nearest rational number that satisfies our requirements

    const [p, q, err] = closestRational(d, dn, Number.MAX_SAFE_INTEGER); // Return the fraction if close enough, but rigorously so (see Theory)

    if (err <= pow2(exp - 52)) return [negative ? -p : p, q];
    return [NaN, NaN];
  } // Cached values for doubleToRational


  let lastDoubleToRationalArg = 0;
  let lastDoubleToRationalRes = [0, 1];
  /**
   * This function classifies floats, which are all technically rationals (more specifically, dyadic rationals), as
   * rational or irrational numbers. See Grapheme Theory, "Intelligent Pow" for more information. In short, at most
   * 1/10000 of floats are classified as rational, and the potential returned rational numbers vary depending on the
   * magnitude of d. The technique expounded is very general, and any fraction of floats being rational can be pretty
   * much guaranteed. Takes about 0.0004 ms / call on my computer.
   * @param d {number} The number to convert to a rational
   * @param cache {boolean} Whether to cache the result to speed up later calls
   * @returns {number[]} Two-element array; first is the numerator, second is the denominator
   */

  function doubleToRational(d, cache = true) {
    if (d === lastDoubleToRationalArg) return lastDoubleToRationalRes;

    const res = _doubleToRational(d);

    if (cache) {
      lastDoubleToRationalRes = res;
      lastDoubleToRationalArg = d;
    }

    return res;
  }

  /**
   * @file This file allows the computation of pow with "near-rational" numbers.
   */

  function powRational(a, c, d) {
    // Simple return cases
    if (d === 0 || Number.isNaN(c) || Number.isNaN(d) || !Number.isInteger(c) || !Number.isInteger(d) || Number.isNaN(a)) {
      return NaN;
    }

    if (a === 0) return 0;
    const evenDenom = d % 2 === 0;
    const evenNumer = c % 2 === 0;
    if (evenDenom && a < 0) return NaN;

    if (d < 0) {
      c = -c;
      d = -d;
    } // Now we know that a is not NaN, c is an integer, and d is a nonzero positive integer. Also, the answer is not NaN.


    const mag = Math.pow(Math.abs(a), c / d);

    if (a >= 0) {
      // Can just do Math.pow
      return mag;
    } else if (a === 0) {
      return 0;
    } else {
      // We know that evenDenom is false
      return evenNumer ? mag : -mag;
    }
  }
  /**
   * Given a < 0 and non-integer b, try to compute a ^ b. We try to convert b to a nearby rational number. If there is no
   * such rational number, we assume that b is irrational and simply return NaN. If there is such a rational number p/q,
   * then we return NaN if q is even, and otherwise return the mathematical value.
   * @param a {number} The base of the exponential
   * @param b {number} The exponent
   * @private
   */


  function powSpecial(a, b) {
    const [num, den] = doubleToRational(b); // deemed irrational

    if (!den) return NaN; // integer, just use <i>Math.pow</i> directly

    if (den === 1) return Math.pow(a, num);
    return powRational(a, num, den);
  }
  /**
   * This function computes a^b, where a and b are floats, but does not always return NaN for a < 0 and b ≠ Z. The
   * method by which this is bodged is specified in Grapheme Theory. The idea is that something like pow(-1, 1/3), instead
   * of returning NaN, returns -1. For the special cases, it takes about 0.006 ms per evaluation on my computer.
   *
   * There are some special cases:
   *   a. if a === b === 0, 1 is returned (this is same as <i>Math.pow</i>)
   *   b. if a is NaN or b is NaN, NaN is returned
   *   c. if a < 0, b not an integer, a special algorithm is used (see above)
   *   d. The rest of the cases are identical to <i>Math.pow</i>.
   *
   * Contrast these cases with <i>Math.pow</i> at https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate
   * @param a {number} The base of the exponential
   * @param b {number} The exponent
   * @returns {number} a ^ b as described
   * @function pow
   * @memberOf RealFunctions
   */


  function pow(a, b) {
    if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
    if (a < 0 && a > -Infinity && !Number.isInteger(b)) return powSpecial(a, b);
    return Math.pow(a, b);
  }

  /**
   * @file Definition of the {@link RealFunctions}, or functions outside of the built-in <i>Math</i> that accept
   * floating-point numbers as arguments.
   */
  /**
   * Functions that accept double-precision floating point numbers as arguments. Common functions not here are likely
   * provided by Math, so use those instead. Note that {@link RealFunctions.pow} is functionally different than
   * <i>Math.pow</i>.
   * @namespace RealFunctions
   */

  const RealFunctions = Object.freeze({
    add,
    divide,
    multiply,
    subtract,
    gcd,
    gamma,
    lnGamma,
    factorial,
    pow
  });

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  /**
   * A base class to use for event listeners and the like. Supports things like addEventListener(eventName, callback),
   * triggerEvent(name, ?data), removeEventListener( ... ), removeEventListeners(?name). Listeners are called with
   * data and this as parameters. If a listener returns true, the event does not propagate to any other listeners.
   */
  class Eventful {
    constructor() {
      _defineProperty(this, "eventListeners", new Map());
    }

    /**
     * Register an event listener to a given event name. It will be given lower priority than the ones that came before.
     * The callbacks will be given a single parameter "data".
     * @param eventName {string} The name of the event
     * @param callback {function|Array} The callback(s) to register
     * @returns {Eventful} Returns self (for chaining)
     */
    addEventListener(eventName, callback) {
      if (Array.isArray(callback)) {
        for (const c of callback) this.addEventListener(eventName, c);

        return this;
      } else if (typeof callback === "function") {
        if (typeof eventName !== "string" || !eventName) throw new TypeError("Invalid event name");
        let listeners = this.eventListeners.get(eventName);

        if (!listeners) {
          listeners = [];
          this.eventListeners.set(eventName, listeners);
        }

        if (!listeners.includes(callback)) listeners.push(callback);
        return this;
      } else throw new TypeError("Invalid callback");
    }
    /**
     * Get the event listeners under "eventName", cloned so that they can be derped around with
     * @param eventName {string} Name of the event whose listeners we want
     * @returns {Array<function>}
     */


    getEventListeners(eventName) {
      const listeners = this.eventListeners.get(eventName);
      return Array.isArray(listeners) ? listeners.slice() : [];
    }
    /**
     * Whether there are any event listeners registered for the given name
     * @param eventName
     * @returns {boolean} Whether any listeners are registered for that event
     */


    hasEventListenersFor(eventName) {
      return Array.isArray(this.eventListeners.get(eventName));
    }
    /**
     * Remove an event listener from the given event. Fails silently if that listener is not registered.
     * @param eventName {string} The name of the event
     * @param callback {function} The callback to remove
     * @returns {Eventful} Returns self (for chaining)
     */


    removeEventListener(eventName, callback) {
      if (Array.isArray(callback)) {
        for (const c of callback) this.removeEventListener(eventName, c);

        return this;
      }

      const listeners = this.eventListeners.get(eventName);

      if (Array.isArray(listeners)) {
        const index = listeners.indexOf(callback);
        if (index !== -1) listeners.splice(index, 1);
        if (listeners.length === 0) this.eventListeners.delete(eventName);
      }

      return this;
    }
    /**
     * Remove all event listeners for a given event. Fails silently if there are no listeners registered for that event.
     * @param eventName {string} The name of the event whose listeners should be cleared
     * @returns {Eventful} Returns self (for chaining)
     */


    removeEventListeners(eventName) {
      this.eventListeners.delete(eventName);
      return this;
    }
    /**
     * Trigger the listeners registered under an event name, passing (data, this, eventName) to each. Returns true if
     * some listener returned true, stopping propagation; returns false otherwise
     * @param eventName {string} Name of the event to be triggered
     * @param data {any} Optional data parameter to be passed to listeners
     * @returns {boolean} Whether any listener stopped propagation
     */


    triggerEvent(eventName, data) {
      const listeners = this.eventListeners.get(eventName);

      if (Array.isArray(listeners)) {
        for (let i = 0; i < listeners.length; ++i) {
          if (listeners[i](data, this, eventName)) return true;
        }
      }

      return false;
    }

  }

  /**
   * The concept here is to allow the execution of expensive functions both synchronously and asynchronously, without the
   * need for a web worker or other heavyweight techniques. There are benefits to both synchronous and asynchronous
   * execution; some functions are so oft-executed and take such a short time that there is no point to using setTimeout
   * and making it asynchronous. I fear that the proliferation of asynchronous APIs all over the Internet discourages
   * simple, effective code. Also, the current asynchronous APIs aren't the most versatile. For example, how could we
   * track the progress of a render, or cancel the render, via Promises alone?
   *
   * Web workers, while useful (I plan to eventually implement them), are difficult. They can't really do rendering work,
   * and if the function in question takes an absurdly long amount of time to execute, it cannot be terminated gracefully;
   * the entire worker needs to be terminated and then restarted.
   *
   * We use a generator-like object called a "bolus". Why? Because I like that word. Also, it makes it feel
   * like the evaluation of these expensive functions is like digestion. We consume a bolus and digest it asynchronously;
   * it's not like while we're digesting, we can't do anything else. We do get periodic interruptions—stomach cramps,
   * defecation—but it does not control our life. If digestion is taking too long, we can go to the doctor and get a
   * laxative. Using a Web Worker is like giving the bolus to a chemical digester (or another person), and then eating the
   * digested remains; not appetizing, and the process of transferring a disgusting bolus soup is not pleasant. If we find
   * out the bolus is poisonous (aka, we don't want to fully digest it), we can vomit up the bolus, but this is not
   * guaranteed. If this bolus is extremely poisonous, we may die; similarly, if a Grapheme bolus is poorly made, it may
   * still crash the webpage. (Okay, henceforth every "bolus" is a Grapheme bolus.)
   *
   * The bolus may accept any number of arguments. If it is detected to be a normal function (that is, one whose return
   * value does not have a "next" function), its result is given if it's synchronously evaluated, or given as a Promise if
   * asynchronously evaluated. If it is a generator, then during its execution it may periodically yield. If synchronously
   * evaluated, the wrapper will simply keep calling .next() (digestion) until it returns, and then return this value.
   * If asynchronously evaluated, the wrapper will keep calling .next() until some amount of time has elapsed (default is
   * 8 ms, since a frame is 1/60 s) since the function call, or the function returns; in the former case, a timeout will
   * be called to unblock, and in the latter case, the result of the function resolves the Promise.
   *
   * There are additional things that may be given to the wrapper functions for convenience. For example, both sync and
   * asyncEvaluate can be told to throw an error (and thus in the latter case, reject the Promise) if too much time has
   * elapsed. Note that this won't prevent an errant function which enters an infinite loop and NEVER yields from crashing
   * the browser, but in the case of syncEvaluate, it can prevent crashes. Furthermore, asyncEvaluate may be given an
   * additional "onProgress" callback function along with the bolus, which is called based on the estimated time for a
   * bolus to finish, and the Promise it returns is equipped with a special function .cancel() which may be called to
   * terminate the function (and call reject()) before it actually ends. This is useful for things like cancelling
   * expensive updates.
   */
  // Find the sum of integers from 1 to n in bolus form
  function testBolus(n) {
    let i = 0;
    let sum = 0;
    let finished = false;
    return {
      next() {
        if (finished) return {
          value: undefined,
          done: true
        };

        for (let j = 0; j <= 1e5; ++i, ++j) {
          // Sum at most 10000 values
          sum += i;

          if (i === n) {
            finished = true;
            return {
              value: sum,
              done: true
            };
          }
        }

        return {
          value: i / n,
          done: false
        };
      }

    };
  }
  function coatBolus(bolus, stepIndex, stepCount) {}

  class BolusTimeoutError extends Error {
    constructor(message) {
      super(message);
      this.name = 'BolusTimeoutError';
    }

  }
  /**
   * A Bolus is any object with a next() function and potentially a cleanup() function. The cleanup() function is called
   * only if the bolus is terminated early. If the bolus is cancelled after completing digestion, cleanup() is not called.
   * next() returns { value: ..., done: false/true }. cleanup() is optional, and will be called if the generator finishes,
   * is canceled, or throws. value is a number between 0 and 1 representing the progress so far.
   * @typedef Bolus {Object}
   * @property {function} next
   * @property {function} cleanup
   */

  /**
   * Digest a bolus directly, which is ideal for some quickly evaluated boluses. A timeout may also be provided which will
   * terminate the bolus early if necessary. Note that if the bolus finishes and more than timeout ms have elapsed, an
   * error will not be thrown, but if the bolus has yielded without finishing and more than timeout ms have elapsed, it
   * will throw a BolusTimeoutError.
   *
   * Functions may return a bolus or, if they are exceedingly cheap, may return the value. Thus, syncDigest forwards non-
   * boluses directly.
   * @param bolus {Bolus} The bolus to evaluate, which may be a normal function or a generator.
   * @param timeout {number} Timeout length in milliseconds
   */


  function syncDigest(bolus, timeout = -1) {
    if (typeof (bolus === null || bolus === void 0 ? void 0 : bolus.next) !== 'function') return bolus;

    try {
      // Allow timeouts between one ms and one day
      if (timeout >= 1 && timeout <= 8.64e7) {
        /**
         * Note: this code is not safe for time changes, which perhaps we can fix at some point.
         * Also, there are some browser features (notably Firefox's privacy.resistFingerprinting) that artificially rounds
         * the Date.now() and performance.now() values. Indeed, their accuracy is never guaranteed. That is unfortunately
         * a fundamental limitation with Grapheme as it presently stands.
         */
        const startTime = Date.now();

        while (true) {
          // Iterate through the bolus
          const next = bolus.next();

          if (next.done) {
            // return the result if done
            return next.value;
          }

          const delta = Date.now() - startTime;

          if (delta > timeout) {
            // anger
            // Clean up if needed
            if (bolus.cleanup) bolus.cleanup();
            throw new BolusTimeoutError('Bolus did not digest within ' + timeout + ' ms.');
          }
        }
      } else if (timeout !== -1) {
        throw new RangeError('Invalid timeout, which must be between 1 and 86,400,000 ms, or -1 to signify no timeout.');
      }

      while (true) {
        const next = bolus.next();
        if (next.done) return next.value;
      }
    } finally {
      var _bolus$cleanup;

      // Potentially clean up
      (_bolus$cleanup = bolus.cleanup) === null || _bolus$cleanup === void 0 ? void 0 : _bolus$cleanup.call(bolus);
    }
  }
  /**
   * Digest a bolus asynchronously.
   * @param bolus
   * @param onProgress
   * @param timeout
   */

  function asyncDigest(bolus, onProgress, timeout = -1) {}

  /**
   * The following interface is basically a key -> object dict, with some additional features. First, each property is
   * associated with a "prop store" that includes the property value, whether it has changed since the last time it was
   * marked as processed, and potentially other info, like whether it should be inherited.
   *
   * Any accesses to a nonexistent property return undefined, and no property can have value undefined -- that's basically
   * the way such properties are treated. When a property is removed with .delete(name), however, the underlying
   * propStore is not immediately deleted; instead, the propStore has its value replaced with undefined, and its changed
   * value set to true, since the property has changed value, and must be processed appropriately before marking it as
   * not changed and deleting the store. With regards to any particular propName, an ElementProps object can 1. "have a
   * property propName with value propValue", 2. "be undefined", or 3. "be undefined AND have a propStore indicating its
   * value has changed."
   *
   * The meaning of whether a value has "changed" can be a bit hard to understand, not least because the same ElementProps object is used
   * for the element's defined properties and for its computed properties. In simplest terms, it represents that the
   * changed property must be processed when the element is updated. Take the example of a simple polyline, with given
   * vertices [v1, v2, ..., vn] as an array of Vec2s. Most of the polyline code prefers vertices in a canonical form
   * [x1, y1, x2, y2, ..., xn, yn]. To prepare the polyline to be rendered, we need to provide the renderer with a
   * triangulation of the polyline's "thick" image. The triangulation is not only dependent on the vertices, but the
   * polyline's pen -- which defines things like line thickness, color, and presence of dashes.
   *
   * At element creation, all properties have changed: true, since they must all be processed; when adding an element to a
   * parent, it must inherit all the parent's properties as if they had changed: true. The inheritance algorithm is
   * simple: a parent may have computed properties with inherit: 1, which should be propagated down to all children
   * (regardless of whether they actually use the value). Examples of inherited properties include sceneDims (top-level
   * size of the scene), plotTransform, plotBoundingBox. The actual implementation of inheritance is left to the elements;
   * they could implement custom inheritance operations, or simply discard the inherited value.
   *
   * The obvious questions are: 1. why use a custom prop system like this? Why not just use static properties?
   * and 2. why use inheritance? Why not just tell each graph the plot and the scene it's in? Isn't that enough? Aren't
   * you massively overcomplicating things?
   *
   * 1) A custom prop system allows us to keep track of whether certain values have changed. It'd be foolish to not store
   * this information, and just recompute everything on each update. A single "needsUpdate" status could work, but still
   * discards a lot of information. As we'll see, knowing that only a few parameters have changed can be very useful,
   * especially with more aggressive caching, making updating significantly faster.
   *
   * 2) It's complicated, yes, but inheritance has multiple benefits. First, it allows us to keep track of changes which
   * can be optimized for in various implementations. Instead of changing the plot x transform and telling all the plots
   * "oh, something has changed, go figure it out for yourself", we can just tell it that the x transform has changed.
   * There is some cost for inheritance, of course, and in many cases the same benefit can be done via caching—which is
   * what will hopefully be done in *most* implementations.
   *
   * Suppose we change the vertices attribute, marking its property in the props object as "changed: true". (Note that if
   * we mutate the vertices array by ourselves, we have to manually mark it as changed.)
   */
  class ElementProps {
    constructor() {
      this.store = new Map();
      this.needsUpdate = true;
    }

    delete(propName) {
      this._set(propName, undefined);

      return this;
    }
    /**
     * Given a callback, call the callback with (propName, propStore) for every element, except deleted elements (though
     * those are included if includeDeletedProps is true
     * @param callback {function}
     * @param includeDeletedProps {boolean}
     */


    forEach(callback, includeDeletedProps = false) {
      for (const [propName, propStore] of this.store.entries()) {
        if (!includeDeletedProps && propStore.value === undefined) continue;
        callback(propName, propStore);
      }
    }
    /**
     * Given a callback, call the callback with (propName, propStore) for every property which has changed: true, except
     * deleted elements (which are included if includeDeletedProps is true)
     * @param callback
     * @param includeDeletedProps
     */


    forEachChanged(callback, includeDeletedProps = true) {
      for (const [propName, propStore] of this.store.entries()) {
        if (!includeDeletedProps && propStore.value === undefined) continue;
        callback(propName, propStore);
      }
    }
    /**
     * Get the value of a property, returning undefined if it does not exist.
     * @param propName
     * @returns {undefined}
     */


    get(propName) {
      const propStore = this.store.get(propName);
      return propStore ? propStore.value : undefined;
    } // Gets the prop store of an element


    getPropStore(propName, createIfUndef = false) {
      let propStore = this.store.get(propName);

      if (!propStore && createIfUndef) {
        propStore = {
          value: undefined,
          changed: true
        };
        this.store.set(propName, propStore);
      }

      return propStore;
    }

    has(propName) {
      return this.get(propName) === undefined;
    }

    hasChanged(propName) {
      if (Array.isArray(propName)) {
        for (let i = 0; i < propName.length; ++i) {
          var _this$store$get;

          if ((_this$store$get = this.store.get(propName[i])) === null || _this$store$get === void 0 ? void 0 : _this$store$get.changed) return true;
        }

        return false;
      } else {
        var _this$store$get2;

        return (_this$store$get2 = this.store.get(propName)) === null || _this$store$get2 === void 0 ? void 0 : _this$store$get2.changed;
      }
    }

    markAllChanged(changed = true) {
      for (const [propName, propStore] of this.store.entries()) {
        propStore.changed = changed;
        if (!changed && propStore.value === undefined) this.store.delete(propName);
      }
    }

    markChanged(propName, changed = true) {
      const propStore = this.store.get(propName);

      if (!propStore) {
        if (changed) this.set(propName, undefined); // TODO
      } else {
        propStore.changed = changed;
      }

      this.needsUpdate = true;
    } // Remove property stores that are undefined and have changed: false


    removeUnused() {
      for (const [propName, propStore] of this.store.entries()) {
        if (propStore.value === undefined && propStore.changed) this.store.delete(propName);
      }
    }

    _set(propName, value, config) {
      const store = this.store;
      let propStore = store.get(propName); // Deleting a value

      if (value === undefined) {
        if (!propStore) return;
        propStore.value = undefined;
        propStore.changed = true;
      } else {
        if (propStore) {
          if (propStore.value === value) return;
          propStore.value = value;
          propStore.changed = true;
        } else {
          propStore = {
            value,
            changed: true
          };
          store.set(propName, propStore);
        }

        if ((config === null || config === void 0 ? void 0 : config.inherit) !== undefined) {
          propStore.inherit = config.inherit;
        }
      }

      this.needsUpdate = true;
    }

    set(propName, value, config) {
      if (typeof propName === "object") {
        // Overloaded function; can be called as set  ( key, value ) or set (dict)
        for (const [key, val] of Object.entries(propName)) this._set(key, val, config);

        return this;
      } else if (typeof propName !== "string") throw new TypeError("Element property name must be a string.");

      this._set(propName, value, config);

      return this;
    }

    toJSON() {
      const ret = {};
      this.forEach((name, propStore) => ret[name] = propStore, true);
      return ret;
    }

  } // Functions describing more complex prop store operations.

  /**
   * Returns true if there were props to inherit
   * @param targetProps
   * @param baseProps
   * @returns {boolean}
   * @private
   */

  function _inheritChangedInheritablePropsFromBase(targetProps, baseProps) {
    let propsFound = false;

    for (const [propName, propStore] of baseProps.store.entries()) {
      if (propStore.inherit && propStore.changed) {
        targetProps.store.set(propName, _objectSpread2({}, propStore));
        propsFound = true;
      }
    }

    return propsFound;
  }
  function _inheritAllInheritablePropsFromBase(targetProps, baseProps) {
    let propsFound = false;

    for (const [propName, propStore] of baseProps.store.entries()) {
      if (propStore.inherit) {
        targetProps.store.set(propName, {
          inherit: true,
          changed: true,
          value: propStore.value
        });
        propsFound = true;
      }
    }

    return propsFound;
  }
  function _inheritAllChangedPropsFromBase(targetProps, baseProps) {
    for (const [propName, propStore] of baseProps.store.entries()) {
      if (propStore.changed) {
        targetProps.store.set(propName, _objectSpread2({}, propStore));
      }
    }
  }
  function _inheritAllPropsFromBase(targetProps, baseProps) {
    for (const [propName, propStore] of baseProps.store.entries()) {
      targetProps.store.set(propName, {
        inherit: propStore.inherit,
        changed: true,
        value: propStore.value
      });
    }
  }
  function _forwardPropsByNameDict(targetProps, baseProps, aliases, forwardChangedValue = true) {
    throw "";
  }
  /**
   * Copy changed properties from base props into target props
   * @param targetProps
   * @param baseProps
   * @param propNames
   * @private
   */

  function _forwardChangedProps(targetProps, baseProps, propNames) {
    const baseStore = baseProps.store;
    const targetStore = targetProps.store;

    if (propNames) {
      for (const propName of propNames) {
        const propStore = baseStore.get(propName);

        if (propStore.changed) {
          targetStore.set(propName, {
            value: propStore.value,
            changed: true,
            inherit: propStore.inherit
          });
        }
      }
    } else {
      for (const [propName, propStore] of baseStore.entries()) {
        if (propStore.changed) {
          targetStore.set(propName, {
            value: propStore.value,
            changed: true,
            inherit: propStore.inherit
          });
        }
      }
    }
  }

  /**
   * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
   * DOM elements, being nestable and having events.
   *
   * An Element has properties, which may be explicitly specified, inherited
   */
  /**
   * The element class.
   */

  class Element extends Eventful {
    constructor(params = {}) {
      var _params$id;

      super();
      /**
       * Unique string id of this element
       * @type {string}
       * @property
       */

      this.id = (_params$id = params.id) !== null && _params$id !== void 0 ? _params$id : getStringID();
      if (typeof this.id !== "string" || this.id.length === 0) throw new TypeError("The element id must be a non-empty string.");
      /**
       * The parent of this element; null if it has no parent
       * @type{Element|null}
       * @property
       */

      this.parent = null;
      /**
       * The scene this element is a part of; Adam or Eve.
       * @type {Scene|null}
       * @property
       */

      this.scene = null;
      /**
       * Which stage of updating the element is on, relative to its neighbors.
       *
       * updateStage: -2 means just added to a parent
       * updateStage: -1 means finished updating
       * updateStage: 0 means needs to update
       * @type {number}
       */

      this.updateStage = 0;
      /**
       * @type {ElementProps}
       * @property
       */

      this.props = new ElementProps(this);
      /**
       * These are the properties as computed after inheritance, updating, et cetera. They can be grabbed at any time, but
       * are only final after updating has finished. Their definitions can be rather complicated.
       * @type {ElementProps}
       * @property
       */

      this.computedProps = new ElementProps();
      /**
       * Used for storing intermediate results, a cache of sorts
       * @type {Object}
       * @property
       */

      this.internal = {};
    }
    /**
     * Apply a function to each element of a group
     * @param callback
     */


    apply(callback) {
      callback(this);
    }

    get(propName) {
      return this.props.get(propName);
    }

    getComputed(propName) {
      return this.computedProps.get(propName);
    }

    getRenderingInstructions() {}

    isChild(child, recursive = true) {
      return false;
    }
    /**
     * Whether this element can have children.
     * @returns {boolean}
     */


    isGroup() {
      return false;
    }

    isScene() {
      return false;
    }

    set(propName, value) {
      this.props.set(propName, value);
      if (this.props.needsUpdate) this.updateStage = 0;
      return this;
    }

    setScene(scene) {
      this.scene = scene;
    }

    update() {}

    _defaultInheritProps() {
      const parentProps = this.parent.computedProps;
      const thisProps = this.computedProps;

      if (this.updateStage === -2) {
        _inheritAllInheritablePropsFromBase(thisProps, parentProps);
      } else {
        _inheritChangedInheritablePropsFromBase(thisProps, parentProps);
      }

      if (this.computedProps.needsUpdate) this.updateStage = 0;
    }

  }

  class Group extends Element {
    constructor(params = {}) {
      super(params);
      this.children = [];
    }
    /**
     * Add an element to this group.
     * @param elem {Element}
     * @returns {Group}
     */


    add(elem) {
      if (elem.isScene()) throw new Error("Scene cannot be a child");
      if (elem.parent) throw new Error("Parent already there");
      if (!(elem instanceof Element)) throw new TypeError("Element not element");
      if (elem === this) throw new Error("Can't add self");
      if (elem.isChild(this)) throw new Error("Can't make cycle");
      this.children.push(elem);
      elem.parent = this;
      elem.setScene(this.scene);
      elem.updateStage = -2;
      return this;
    }
    /**
     * Run callback(element) on this element and all the element's children
     * @param callback {Function}
     */


    apply(callback) {
      callback(this);
      this.children.forEach(child => child.apply(callback));
    }
    /**
     * Whether the given element is a child of this element
     * @param elem {Element}
     * @param recursive {boolean} If true, whether it is any child; if false, whether it is a direct child
     * @returns {boolean}
     */


    isChild(elem, recursive = true) {
      for (const child of this.children) {
        if (child === elem) return true;
        if (recursive && child.isChild(elem, true)) return true;
      }

      return false;
    }

    isGroup() {
      return true;
    }

    remove(elem) {
      const index = this.children.indexOf(elem);

      if (index !== -1) {
        this.children.splice(index, 1);
        elem.parent = null;
        elem.setScene(null);
        elem.updateStage = -2;
        return this;
      }

      throw new Error("Not a direct child");
    }

    setScene(scene) {
      this.scene = scene;
      this.children.forEach(child => child.setScene(scene));
    } // todo


    triggerEvent(eventName, data) {}

    update(updateParams) {
      if (this.updateStage === -1) return;

      this._defaultInheritProps();

      this.updateStage = -1;
    }

  }

  // TODO An experimental way for type-checking and validation in element properties. These are enforced on the element props,
  // not the computedProps.
  function _attachConvenienceGettersToElement(elementPrototype, elementParameters) {
    for (const [paramName, paramDetails] of Object.entries(elementParameters)) {
      Object.defineProperty(elementPrototype, paramName, {
        get() {
          return this.get(paramName);
        },

        set(value) {
          this.set(paramName, value);
        }

      });
    }
  }

  /**
   * @file This file describes a {@link Vec2} class. It is intended to be lightweight and mainly for internal use.
   */

  /**
   * A 2D vector consisting of two floating-point numbers x and y.
   */
  class Vec2 {
    /**
     * Construct a Vec2. Because this operation is incredibly frequent, the constructor is simple. There are special
     * static class functions for constructing a vector, or setting a vector, from other forms.
     * @param x {number} The x component of the vector
     * @param y {number} The y component of the vector
     */
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

  }

  class BoundingBox {
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }

    get x1() {
      return this.x;
    }

    get y1() {
      return this.y;
    }

    get x2() {
      return this.x + this.width;
    }

    get y2() {
      return this.y + this.height;
    }

  }
  const boundingBoxTransform = {
    X: (x, box1, box2, flipX) => {
      if (Array.isArray(x) || isTypedArray(x)) {
        for (let i = 0; i < x.length; ++i) {
          let fractionAlong = (x[i] - box1.x) / box1.width;
          if (flipX) fractionAlong = 1 - fractionAlong;
          x[i] = fractionAlong * box2.width + box2.x;
        }

        return x;
      } else {
        return boundingBoxTransform.X([x], box1, box2, flipX)[0];
      }
    },
    Y: (y, box1, box2, flipY) => {
      if (Array.isArray(y) || isTypedArray(y)) {
        for (let i = 0; i < y.length; ++i) {
          let fractionAlong = (y[i] - box1.y) / box1.height;
          if (flipY) fractionAlong = 1 - fractionAlong;
          y[i] = fractionAlong * box2.height + box2.y;
        }

        return y;
      } else {
        return boundingBoxTransform.Y([y], box1, box2, flipY)[0];
      }
    },
    XY: (xy, box1, box2, flipX, flipY) => {
      if (Array.isArray(xy) || isTypedArray(x)) {
        for (let i = 0; i < xy.length; i += 2) {
          let fractionAlong = (xy[i] - box1.x) / box1.width;
          if (flipX) fractionAlong = 1 - fractionAlong;
          xy[i] = fractionAlong * box2.width + box2.x;
          fractionAlong = (xy[i + 1] - box1.y) / box1.height;
          if (flipY) fractionAlong = 1 - fractionAlong;
          xy[i + 1] = fractionAlong * box2.height + box2.y;
        }

        return xy;
      } else {
        throw new Error("No");
      }
    },

    getReducedTransform(box1, box2, flipX, flipY) {
      let x_m = 1 / box1.width;
      let x_b = -box1.x / box1.width;

      if (flipX) {
        x_m *= -1;
        x_b = 1 - x_b;
      }

      x_m *= box2.width;
      x_b *= box2.width;
      x_b += box2.x;
      let y_m = 1 / box1.height;
      let y_b = -box1.y / box1.height;

      if (flipY) {
        y_m *= -1;
        y_b = 1 - y_b;
      }

      y_m *= box2.height;
      y_b *= box2.height;
      y_b += box2.y;
      return {
        x_m,
        x_b,
        y_m,
        y_b
      };
    }

  };
  const EMPTY = new BoundingBox(new Vec2(0, 0), 0, 0);

  function intersectBoundingBoxes(box1, box2) {
    let x1 = Math.max(box1.x, box2.x);
    let y1 = Math.max(box1.y, box2.y);
    let x2 = Math.min(box1.x2, box2.x2);
    let y2 = Math.min(box1.y2, box2.y2);

    if (x2 < x1) {
      return EMPTY.clone();
    }

    if (y2 < y1) {
      return EMPTY.clone();
    }

    let width = x2 - x1;
    let height = y2 - y1;
    return new BoundingBox(new Vec2(x1, y1), width, height);
  }

  const MIN_SCENE_SIZE = [100, 100];
  const DEFAULT_SCENE_SIZE = [640, 480];

  class SceneDimensions {
    constructor(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.canvasWidth = this.dpr * this.width;
      this.canvasHeight = this.dpr * this.height;
    }

    getBBox() {
      return new BoundingBox(0, 0, this.width, this.height);
    }

  }

  const sceneParameters = {
    "dpr": {
      description: "The device pixel ratio.",
      default: 1,
      validate: th => typeof th === "number" && Math.abs(th) < 50
    },
    "width": {
      description: "The width of the plot in CSS pixels.",
      validate: w => typeof w === "number" && Number.isInteger(w) && w >= 100 && w <= 16384,
      default: 640
    },
    "height": {
      description: "The width of the plot in CSS pixels.",
      validate: w => typeof w === "number" && Number.isInteger(w) && w >= 100 && w <= 16384,
      default: 480
    }
  };
  class Scene extends Group {
    constructor(params = {}) {
      super(params); // Scene is its own scene

      this.scene = this;
      this.setSize(...DEFAULT_SCENE_SIZE);
    }

    setSize(width, height) {
      this.set({
        width,
        height
      });
    }

    isScene() {
      return true;
    }

    update(updateParams) {
      if (this.updateStage === -1) return;
      const {
        props,
        computedProps
      } = this; // A bit overcomplicated, just to get the ideas down
      // "Dependencies" of a sort

      if (props.hasChanged(["width", "height", "dpr"])) {
        let width = props.get("width"),
            height = props.get("height"),
            dpr = props.get("dpr");
        if (!width || width < MIN_SCENE_SIZE[0]) width = Math.round(DEFAULT_SCENE_SIZE[0]);
        if (!height || height < MIN_SCENE_SIZE[1]) height = Math.round(DEFAULT_SCENE_SIZE[1]);
        if (!dpr) dpr = 1;
        computedProps.set("sceneDimensions", new SceneDimensions(width, height, dpr), {
          inherit: 1
        }); // If an inherited prop has changed, all children need to be recomputed. This will recurse downwards

        this.children.forEach(child => child.updateStage = 0);
      }

      this.updateStage = -1;
    }

    getInheritableProps() {}

  }

  _attachConvenienceGettersToElement(Scene.prototype, sceneParameters);

  // This function takes in a GL rendering context, a type of shader (fragment/vertex),
  // and the GLSL source code for that shader, then returns the compiled shader
  function createShaderFromSource(gl, shaderType, shaderSourceText) {
    // create an (empty) shader of the provided type
    const shader = gl.createShader(shaderType); // set the source of the shader to the provided source

    gl.shaderSource(shader, shaderSourceText); // compile the shader!! piquant

    gl.compileShader(shader); // get whether the shader compiled properly

    const succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (succeeded) {
      return shader; // return it if it compiled properly
    }

    const err = new Error(gl.getShaderInfoLog(shader)); // delete the shader to free it from memory

    gl.deleteShader(shader); // throw an error with the details of why the compilation failed

    throw err;
  } // This function takes in a GL rendering context, the fragment shader, and the vertex shader,
  // and returns a compiled program.


  function createGLProgram(gl, vertShader, fragShader) {
    // create an (empty) GL program
    const program = gl.createProgram(); // link the vertex shader

    gl.attachShader(program, vertShader); // link the fragment shader

    gl.attachShader(program, fragShader); // compile the program

    gl.linkProgram(program); // get whether the program compiled properly

    const succeeded = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (succeeded) {
      return program;
    }

    const err = new Error(gl.getProgramInfoLog(program)); // delete the program to free it from memory

    gl.deleteProgram(program); // throw an error with the details of why the compilation failed

    throw err;
  }
  /**
   @class GLResourceManager stores GL resources on a per-context basis. This allows the
   separation of elements and their drawing buffers in a relatively complete way.
   It is given a gl context to operate on, and creates programs in manager.programs
   and buffers in manager.buffers. programs and buffers are simply key-value pairs
   which objects can create (and destroy) as they please.
   */


  class GLResourceManager {
    /**
     * Construct a GLResourceManager
     * @param gl {WebGLRenderingContext} WebGL context the manager will have dominion over
     */
    constructor(gl) {
      // WebGL rendering context
      this.gl = gl; // Compiled programs and created buffers

      this.programs = {};
      this.buffers = {};
      this.textures = {};
    }
    /**
     * Compile a program and store it in this.programs
     * @param programName {string} Name of the program, used to identify the program
     * @param vertexShaderSource {string} Source code of the vertex shader
     * @param fragmentShaderSource {string} Source code of the fragment shader
     * @param vertexAttributeNames {Array} Array of vertex attribute names
     * @param uniformNames {Array} Array of uniform names
     */


    createProgram(programName, vertexShaderSource, fragmentShaderSource, vertexAttributeNames = [], uniformNames = []) {
      if (this.hasProgram(programName)) {
        // if this program name is already taken, delete the old one
        this.deleteProgram(programName);
      }

      const {
        gl
      } = this; // The actual gl program itself

      const glProgram = createGLProgram(gl, createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource), createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)); // pairs of uniform names and their respective locations

      const uniforms = {};

      for (let i = 0; i < uniformNames.length; ++i) {
        const uniformName = uniformNames[i];
        uniforms[uniformName] = gl.getUniformLocation(glProgram, uniformName);
      } // pairs of vertex attribute names and their respective locations


      const vertexAttribs = {};

      for (let i = 0; i < vertexAttributeNames.length; ++i) {
        const vertexAttribName = vertexAttributeNames[i];
        vertexAttribs[vertexAttribName] = gl.getAttribLocation(glProgram, vertexAttribName);
      }

      this.programs[programName] = {
        program: glProgram,
        uniforms,
        attribs: vertexAttribs
      };
      return this.programs[programName];
    }

    onContextLost() {
      this.programs = {};
      this.buffers = {};
      this.textures = {};
    }
    /**
     * Create a buffer with a certain name, typically including a WebGLElement's id
     * @param bufferName {string} Name of the buffer
     */


    createBuffer(bufferName) {
      // If buffer already exists, return
      if (this.hasBuffer(bufferName)) return;
      const {
        gl
      } = this; // Create a new buffer

      this.buffers[bufferName] = gl.createBuffer();
    }
    /**
     * Delete buffer with given name
     * @param bufferName {string} Name of the buffer
     */


    deleteBuffer(bufferName) {
      if (!this.hasBuffer(bufferName)) return;
      const buffer = this.getBuffer(bufferName);
      const {
        gl
      } = this; // Delete the buffer from GL memory

      gl.deleteBuffer(buffer);
      delete this.buffers[bufferName];
    }
    /**
     * Delete a program
     * @param programName {string} Name of the program to be deleted
     */


    deleteProgram(programName) {
      if (!this.hasProgram(programName)) return;
      const programInfo = this.programs[programName];
      this.gl.deleteProgram(programInfo.program); // Remove the key from this.programs

      delete this.programs[programName];
    }
    /**
     * Retrieve a buffer with a given name, and create it if it does not already exist
     * @param bufferName Name of the buffer
     * @returns {WebGLBuffer} Corresponding buffer
     */


    getBuffer(bufferName) {
      if (!this.hasBuffer(bufferName)) this.createBuffer(bufferName);
      return this.buffers[bufferName];
    }
    /**
     * Retrieve program from storage
     * @param programName {string} Name of the program
     * @returns {Object} Object of the form {program, uniforms, vertexAttribs}
     */


    getProgram(programName) {
      return this.programs[programName];
    }
    /**
     * Whether this manager has a buffer with a given name
     * @param bufferName Name of the buffer
     * @returns {boolean} Whether this manager has a buffer with that name
     */


    hasBuffer(bufferName) {
      return !!this.buffers[bufferName];
    }
    /**
     * Whether a program with programName exists
     * @param programName {string} Name of the program
     * @returns {boolean} Whether that program exists
     */


    hasProgram(programName) {
      return !!this.programs[programName];
    }

    createTexture(name) {
      const {
        gl
      } = this;
      return this.textures[name] = gl.createTexture();
    }

    getTexture(name) {
      var _this$textures$name;

      return (_this$textures$name = this.textures[name]) !== null && _this$textures$name !== void 0 ? _this$textures$name : this.createTexture(name);
    }

    hasTexture(name) {
      return !!this.textures[name];
    }

    deleteTexture(name) {
      const texture = this.getTexture(name);

      if (texture) {
        this.gl.deleteTexture(texture);
        delete this.textures[name];
      }
    }

    createTextureFromImage(name, image) {
      const {
        gl
      } = this;
      const newTexture = this.createTexture(name);
      gl.bindTexture(gl.TEXTURE_2D, newTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      return newTexture;
    }

  }

  // Could use a library, but... good experience for me too

  class Color {
    constructor({
      r = 0,
      g = 0,
      b = 0,
      a = 255
    } = {}) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
    }

    rounded() {
      return {
        r: Math.round(this.r),
        g: Math.round(this.g),
        b: Math.round(this.b),
        a: Math.round(this.a)
      };
    }

    toJSON() {
      return {
        r: this.r,
        g: this.g,
        b: this.b,
        a: this.a
      };
    }

    hex() {
      const rnd = this.rounded();
      return "#".concat([rnd.r, rnd.g, rnd.b, rnd.a].map(x => undefined(x.toString(16), 2)).join(''));
    }

    glColor() {
      return {
        r: this.r / 255,
        g: this.g / 255,
        b: this.b / 255,
        a: this.a / 255
      };
    }

    toNumber() {
      return this.r * 0x1000000 + this.g * 0x10000 + this.b * 0x100 + this.a;
    }

    clone() {
      return new Color(this);
    }

    static rgb(r, g, b) {
      return new Color({
        r,
        g,
        b
      });
    }

    static rgba(r, g, b, a = 255) {
      return new Color({
        r,
        g,
        b,
        a
      });
    }

    static hsl(h, s, l) {
      return new Color(hslToRgb(h, s, l));
    }

    static hsla(h, s, l, a) {
      let color = Color.hsl(h, s, l);
      color.a = 255 * a;
      return color;
    }

    static fromHex(string) {
      return new Color(hexToRgb(string));
    }

    static fromCss(cssColorString) {
      function throwBadColor() {
        throw new Error("Unrecognized colour " + cssColorString);
      }

      cssColorString = cssColorString.toLowerCase().replace(/\s+/g, '');

      if (cssColorString.startsWith('#')) {
        return Color.fromHex(cssColorString);
      }

      let argsMatch = /\((.+)\)/g.exec(cssColorString);

      if (!argsMatch) {
        let color = Colors[cssColorString.toUpperCase()];
        return color ? color : throwBadColor();
      }

      let args = argsMatch[1].split(',').map(parseFloat);

      if (cssColorString.startsWith("rgb")) {
        return Color.rgb(...args.map(s => s * 255));
      } else if (cssColorString.startsWith("rgba")) {
        return Color.rgba(...args.map(s => s * 255));
      } else if (cssColorString.startsWith("hsl")) {
        return Color.hsl(...args);
      } else if (cssColorString.startsWith("hsla")) {
        return Color.hsla(...args);
      }

      throwBadColor();
    }

  } // Credit to https://stackoverflow.com/a/11508164/13458117


  function hexToRgb(hex) {
    let bigint = parseInt(hex.replace('#', ''), 16);
    let r = bigint >> 16 & 255;
    let g = bigint >> 8 & 255;
    let b = bigint & 255;
    return {
      r,
      g,
      b
    };
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  } // Credit to https://stackoverflow.com/a/9493060/13458117


  function hslToRgb(h, s, l) {
    var r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: 255 * r,
      g: 255 * g,
      b: 255 * b
    };
  }

  const rgb = Color.rgb;
  const Colors = {
    get LIGHTSALMON() {
      return rgb(255, 160, 122);
    },

    get SALMON() {
      return rgb(250, 128, 114);
    },

    get DARKSALMON() {
      return rgb(233, 150, 122);
    },

    get LIGHTCORAL() {
      return rgb(240, 128, 128);
    },

    get INDIANRED() {
      return rgb(205, 92, 92);
    },

    get CRIMSON() {
      return rgb(220, 20, 60);
    },

    get FIREBRICK() {
      return rgb(178, 34, 34);
    },

    get RED() {
      return rgb(255, 0, 0);
    },

    get DARKRED() {
      return rgb(139, 0, 0);
    },

    get CORAL() {
      return rgb(255, 127, 80);
    },

    get TOMATO() {
      return rgb(255, 99, 71);
    },

    get ORANGERED() {
      return rgb(255, 69, 0);
    },

    get GOLD() {
      return rgb(255, 215, 0);
    },

    get ORANGE() {
      return rgb(255, 165, 0);
    },

    get DARKORANGE() {
      return rgb(255, 140, 0);
    },

    get LIGHTYELLOW() {
      return rgb(255, 255, 224);
    },

    get LEMONCHIFFON() {
      return rgb(255, 250, 205);
    },

    get LIGHTGOLDENRODYELLOW() {
      return rgb(250, 250, 210);
    },

    get PAPAYAWHIP() {
      return rgb(255, 239, 213);
    },

    get MOCCASIN() {
      return rgb(255, 228, 181);
    },

    get PEACHPUFF() {
      return rgb(255, 218, 185);
    },

    get PALEGOLDENROD() {
      return rgb(238, 232, 170);
    },

    get KHAKI() {
      return rgb(240, 230, 140);
    },

    get DARKKHAKI() {
      return rgb(189, 183, 107);
    },

    get YELLOW() {
      return rgb(255, 255, 0);
    },

    get LAWNGREEN() {
      return rgb(124, 252, 0);
    },

    get CHARTREUSE() {
      return rgb(127, 255, 0);
    },

    get LIMEGREEN() {
      return rgb(50, 205, 50);
    },

    get LIME() {
      return rgb(0, 255, 0);
    },

    get FORESTGREEN() {
      return rgb(34, 139, 34);
    },

    get GREEN() {
      return rgb(0, 128, 0);
    },

    get DARKGREEN() {
      return rgb(0, 100, 0);
    },

    get GREENYELLOW() {
      return rgb(173, 255, 47);
    },

    get YELLOWGREEN() {
      return rgb(154, 205, 50);
    },

    get SPRINGGREEN() {
      return rgb(0, 255, 127);
    },

    get MEDIUMSPRINGGREEN() {
      return rgb(0, 250, 154);
    },

    get LIGHTGREEN() {
      return rgb(144, 238, 144);
    },

    get PALEGREEN() {
      return rgb(152, 251, 152);
    },

    get DARKSEAGREEN() {
      return rgb(143, 188, 143);
    },

    get MEDIUMSEAGREEN() {
      return rgb(60, 179, 113);
    },

    get SEAGREEN() {
      return rgb(46, 139, 87);
    },

    get OLIVE() {
      return rgb(128, 128, 0);
    },

    get DARKOLIVEGREEN() {
      return rgb(85, 107, 47);
    },

    get OLIVEDRAB() {
      return rgb(107, 142, 35);
    },

    get LIGHTCYAN() {
      return rgb(224, 255, 255);
    },

    get CYAN() {
      return rgb(0, 255, 255);
    },

    get AQUA() {
      return rgb(0, 255, 255);
    },

    get AQUAMARINE() {
      return rgb(127, 255, 212);
    },

    get MEDIUMAQUAMARINE() {
      return rgb(102, 205, 170);
    },

    get PALETURQUOISE() {
      return rgb(175, 238, 238);
    },

    get TURQUOISE() {
      return rgb(64, 224, 208);
    },

    get MEDIUMTURQUOISE() {
      return rgb(72, 209, 204);
    },

    get DARKTURQUOISE() {
      return rgb(0, 206, 209);
    },

    get LIGHTSEAGREEN() {
      return rgb(32, 178, 170);
    },

    get CADETBLUE() {
      return rgb(95, 158, 160);
    },

    get DARKCYAN() {
      return rgb(0, 139, 139);
    },

    get TEAL() {
      return rgb(0, 128, 128);
    },

    get POWDERBLUE() {
      return rgb(176, 224, 230);
    },

    get LIGHTBLUE() {
      return rgb(173, 216, 230);
    },

    get LIGHTSKYBLUE() {
      return rgb(135, 206, 250);
    },

    get SKYBLUE() {
      return rgb(135, 206, 235);
    },

    get DEEPSKYBLUE() {
      return rgb(0, 191, 255);
    },

    get LIGHTSTEELBLUE() {
      return rgb(176, 196, 222);
    },

    get DODGERBLUE() {
      return rgb(30, 144, 255);
    },

    get CORNFLOWERBLUE() {
      return rgb(100, 149, 237);
    },

    get STEELBLUE() {
      return rgb(70, 130, 180);
    },

    get ROYALBLUE() {
      return rgb(65, 105, 225);
    },

    get BLUE() {
      return rgb(0, 0, 255);
    },

    get MEDIUMBLUE() {
      return rgb(0, 0, 205);
    },

    get DARKBLUE() {
      return rgb(0, 0, 139);
    },

    get NAVY() {
      return rgb(0, 0, 128);
    },

    get MIDNIGHTBLUE() {
      return rgb(25, 25, 112);
    },

    get MEDIUMSLATEBLUE() {
      return rgb(123, 104, 238);
    },

    get SLATEBLUE() {
      return rgb(106, 90, 205);
    },

    get DARKSLATEBLUE() {
      return rgb(72, 61, 139);
    },

    get LAVENDER() {
      return rgb(230, 230, 250);
    },

    get THISTLE() {
      return rgb(216, 191, 216);
    },

    get PLUM() {
      return rgb(221, 160, 221);
    },

    get VIOLET() {
      return rgb(238, 130, 238);
    },

    get ORCHID() {
      return rgb(218, 112, 214);
    },

    get FUCHSIA() {
      return rgb(255, 0, 255);
    },

    get MAGENTA() {
      return rgb(255, 0, 255);
    },

    get MEDIUMORCHID() {
      return rgb(186, 85, 211);
    },

    get MEDIUMPURPLE() {
      return rgb(147, 112, 219);
    },

    get BLUEVIOLET() {
      return rgb(138, 43, 226);
    },

    get DARKVIOLET() {
      return rgb(148, 0, 211);
    },

    get DARKORCHID() {
      return rgb(153, 50, 204);
    },

    get DARKMAGENTA() {
      return rgb(139, 0, 139);
    },

    get PURPLE() {
      return rgb(128, 0, 128);
    },

    get INDIGO() {
      return rgb(75, 0, 130);
    },

    get PINK() {
      return rgb(255, 192, 203);
    },

    get LIGHTPINK() {
      return rgb(255, 182, 193);
    },

    get HOTPINK() {
      return rgb(255, 105, 180);
    },

    get DEEPPINK() {
      return rgb(255, 20, 147);
    },

    get PALEVIOLETRED() {
      return rgb(219, 112, 147);
    },

    get MEDIUMVIOLETRED() {
      return rgb(199, 21, 133);
    },

    get WHITE() {
      return rgb(255, 255, 255);
    },

    get SNOW() {
      return rgb(255, 250, 250);
    },

    get HONEYDEW() {
      return rgb(240, 255, 240);
    },

    get MINTCREAM() {
      return rgb(245, 255, 250);
    },

    get AZURE() {
      return rgb(240, 255, 255);
    },

    get ALICEBLUE() {
      return rgb(240, 248, 255);
    },

    get GHOSTWHITE() {
      return rgb(248, 248, 255);
    },

    get WHITESMOKE() {
      return rgb(245, 245, 245);
    },

    get SEASHELL() {
      return rgb(255, 245, 238);
    },

    get BEIGE() {
      return rgb(245, 245, 220);
    },

    get OLDLACE() {
      return rgb(253, 245, 230);
    },

    get FLORALWHITE() {
      return rgb(255, 250, 240);
    },

    get IVORY() {
      return rgb(255, 255, 240);
    },

    get ANTIQUEWHITE() {
      return rgb(250, 235, 215);
    },

    get LINEN() {
      return rgb(250, 240, 230);
    },

    get LAVENDERBLUSH() {
      return rgb(255, 240, 245);
    },

    get MISTYROSE() {
      return rgb(255, 228, 225);
    },

    get GAINSBORO() {
      return rgb(220, 220, 220);
    },

    get LIGHTGRAY() {
      return rgb(211, 211, 211);
    },

    get SILVER() {
      return rgb(192, 192, 192);
    },

    get DARKGRAY() {
      return rgb(169, 169, 169);
    },

    get GRAY() {
      return rgb(128, 128, 128);
    },

    get DIMGRAY() {
      return rgb(105, 105, 105);
    },

    get LIGHTSLATEGRAY() {
      return rgb(119, 136, 153);
    },

    get SLATEGRAY() {
      return rgb(112, 128, 144);
    },

    get DARKSLATEGRAY() {
      return rgb(47, 79, 79);
    },

    get BLACK() {
      return rgb(0, 0, 0);
    },

    get CORNSILK() {
      return rgb(255, 248, 220);
    },

    get BLANCHEDALMOND() {
      return rgb(255, 235, 205);
    },

    get BISQUE() {
      return rgb(255, 228, 196);
    },

    get NAVAJOWHITE() {
      return rgb(255, 222, 173);
    },

    get WHEAT() {
      return rgb(245, 222, 179);
    },

    get BURLYWOOD() {
      return rgb(222, 184, 135);
    },

    get TAN() {
      return rgb(210, 180, 140);
    },

    get ROSYBROWN() {
      return rgb(188, 143, 143);
    },

    get SANDYBROWN() {
      return rgb(244, 164, 96);
    },

    get GOLDENROD() {
      return rgb(218, 165, 32);
    },

    get PERU() {
      return rgb(205, 133, 63);
    },

    get CHOCOLATE() {
      return rgb(210, 105, 30);
    },

    get SADDLEBROWN() {
      return rgb(139, 69, 19);
    },

    get SIENNA() {
      return rgb(160, 82, 45);
    },

    get BROWN() {
      return rgb(165, 42, 42);
    },

    get MAROON() {
      return rgb(128, 0, 0);
    },

    get RANDOM() {
      var keys = Object.keys(Colors);
      return Colors[keys[keys.length * Math.random() << 0]];
    },

    get TRANSPARENT() {
      return new Color({
        r: 0,
        g: 0,
        b: 0,
        a: 0
      });
    }

  };

  class WebGLRenderer {
    constructor(params = {}) {
      const glCanvas = document.createElement("canvas");
      const glContext = glCanvas.getContext("webgl2");
      this.canvas = glCanvas;
      this.gl = glContext;
      this.glManager = new GLResourceManager(this.gl);
      this.extensions = {
        timerQuery: this.gl.getExtension("EXT_disjoint_timer_query_webgl2")
      };
    }

    clearCanvas() {
      const gl = this.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    /**
     * Resize to the actual canvas buffer size. the DPI stuff is done in the scene.
     * @param width
     * @param height
     */


    resizeTo(width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    } // We render a fully updated scene by clearing the rendering canvas, recursing into the scene, getting render
    // instructions for each element, then rendering them in order.


    renderScene(scene) {
      //console.time("update")
      scene.apply(child => {
        if (child.updateStage !== -1) child.update();
      }); //console.timeEnd("update")
      // If the renderer and scene have the same size, clear the canvas; if not, we resize the canvas which clears it

      if (this.canvas.width === scene.width && this.canvas.height === scene.height) this.clearCanvas();else // Fit scene
        this.resizeTo(scene.width, scene.height);
      const renderingInstructions = []; // This function is applied to every element in the scene

      scene.apply(child => {
        const instructions = child.getRenderingInfo(this);
        renderingInstructions.push(instructions);
      });

      for (const instruction of renderingInstructions) {
        if (typeof instruction === "function") {
          instruction(this);
        }
      }
    }

  }

  class Pen {
    constructor(params = {}) {
      const {
        color = new Color(),
        thickness = 2,
        // in CSS pixels
        dashPattern = [],
        // lengths of alternating dashes
        dashOffset = 0,
        // length of dash offset
        endcap = 'round',
        // endcap, among "butt", "round", "square"
        endcapRes = 1,
        // angle between consecutive endcap roundings, only used in WebGL
        join = 'miter',
        // join type, among "miter", "round", "bevel"
        joinRes = 1,
        // angle between consecutive join roundings
        useNative = false,
        // whether to use native line drawing, only used in WebGL
        visible = true
      } = params;
      this.color = color;
      this.thickness = thickness;
      this.dashPattern = dashPattern;
      this.dashOffset = dashOffset;
      this.endcap = endcap;
      this.endcapRes = endcapRes;
      this.join = join;
      this.joinRes = joinRes;
      this.useNative = useNative;
      this.visible = visible;
    }

    clone() {
      let copy = new Pen(this);
      copy.color = this.color.clone();
    }

    toJSON() {
      return {
        color: this.color.toJSON(),
        thickness: this.thickness,
        dashPattern: this.dashPattern.slice(),
        dashOffset: this.dashOffset,
        endcap: this.endcap,
        endcapRes: this.endcapRes,
        join: this.join,
        joinRes: this.joinRes,
        useNative: this.useNative,
        visible: this.visible
      };
    }

    static fromObj(strOrObj) {
      if (typeof strOrObj === "string") return _interpretStringAsPen(strOrObj);
      return new Pen(strOrObj);
    }

  } // Fun Asymptote Vector Graphics–like thing :) We break up str into tokens which each have some meaning TODO


  function _interpretStringAsPen(str) {
    try {
      let color = Color.fromCss(str);
      return new Pen({
        color
      });
    } catch (_unused) {
      return new Pen();
    }
  }

  function GeometryASMFunctionsCreate(stdlib, foreign, buffer) {
    'use asm';

    var sqrt = stdlib.Math.sqrt;
    var abs = stdlib.Math.abs;
    var atan2 = stdlib.Math.atan2;
    var values = new stdlib.Float64Array(buffer);
    var Infinity = stdlib.Infinity;
    var PI = stdlib.Math.PI;

    function hypot(x, y) {
      x = +x;
      y = +y;
      var quot = 0.0;

      if (+x == +0.0) {
        return abs(y);
      }

      quot = y / x;
      return abs(x) * sqrt(1.0 + quot * quot);
    }

    function fastAtan2(y, x) {
      y = +y;
      x = +x;
      var abs_x = 0.0,
          abs_y = 0.0,
          a = 0.0,
          s = 0.0,
          r = 0.0;
      abs_x = abs(x);
      abs_y = abs(y);
      a = abs_x < abs_y ? abs_x / abs_y : abs_y / abs_x;
      s = a * a;
      r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
      if (abs_y > abs_x) r = 1.57079637 - r;
      if (x < 0.0) r = 3.14159265 - r;
      if (y < 0.0) r = -r;
      return r;
    }

    function point_line_segment_distance(px, py, ax, ay, bx, by) {
      // All input values are floats
      px = +px;
      py = +py;
      ax = +ax;
      ay = +ay;
      bx = +bx;
      by = +by;
      var t = 0.0,
          tx = 0.0,
          ty = 0.0,
          d = 0.0,
          xd = 0.0,
          yd = 0.0;

      if (ax == bx) {
        if (ay == by) {
          return +hypot(px - ax, py - ay);
        }
      }

      xd = bx - ax;
      yd = by - ay;
      t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd);

      if (t < 0.0) {
        t = 0.0;
      } else if (t > 1.0) {
        t = 1.0;
      }

      tx = ax + t * (bx - ax);
      ty = ay + t * (by - ay);
      d = +hypot(px - tx, py - ty);
      return d;
    }

    function point_line_segment_min_distance(px, py, start, end) {
      px = +px;
      py = +py;
      start = start | 0;
      end = end | 0;
      var p = 0,
          q = 0,
          min_distance = 0.0,
          distance = 0.0;
      min_distance = Infinity;

      for (p = start << 3, q = end - 2 << 3; (p | 0) < (q | 0); p = p + 16 | 0) {
        distance = +point_line_segment_distance(px, py, +values[p >> 3], +values[p + 8 >> 3], +values[p + 16 >> 3], +values[p + 24 >> 3]);

        if (distance < min_distance) {
          min_distance = distance;
        }
      }

      return min_distance;
    }

    function point_line_segment_closest(px, py, ax, ay, bx, by) {
      // All input values are floats
      px = +px;
      py = +py;
      ax = +ax;
      ay = +ay;
      bx = +bx;
      by = +by;
      var t = 0.0,
          tx = 0.0,
          ty = 0.0,
          d = 0.0,
          xd = 0.0,
          yd = 0.0;

      if (ax == bx) {
        if (ay == by) {
          values[0] = +ax;
          values[1] = +ay;
          return +hypot(px - ax, py - ay);
        }
      }

      xd = bx - ax;
      yd = by - ay;
      t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd);

      if (t < 0.0) {
        t = 0.0;
      } else if (t > 1.0) {
        t = 1.0;
      }

      tx = ax + t * (bx - ax);
      ty = ay + t * (by - ay);
      values[0] = +tx;
      values[1] = +ty;
      return +hypot(px - tx, py - ty);
    }

    function point_line_segment_min_closest(px, py, start, end) {
      px = +px;
      py = +py;
      start = start | 0;
      end = end | 0;
      var p = 0,
          q = 0,
          min_distance = 0.0,
          distance = 0.0,
          cx = 0.0,
          cy = 0.0;
      min_distance = Infinity;

      for (p = start << 3, q = end - 2 << 3; (p | 0) < (q | 0); p = p + 16 | 0) {
        distance = +point_line_segment_closest(px, py, +values[p >> 3], +values[p + 8 >> 3], +values[p + 16 >> 3], +values[p + 24 >> 3]);

        if (distance < min_distance) {
          min_distance = distance;
          cx = +values[0];
          cy = +values[1];
        }
      }

      values[0] = +cx;
      values[1] = +cy;
      return +min_distance;
    }

    function min(x, y) {
      x = +x;
      y = +y;

      if (x < y) {
        return x;
      }

      return y;
    }

    function angle_between(x1, y1, x2, y2, x3, y3) {
      x1 = +x1;
      y1 = +y1;
      x2 = +x2;
      y2 = +y2;
      x3 = +x3;
      y3 = +y3;
      return +fastAtan2(y3 - y1, x3 - x1) - +fastAtan2(y2 - y1, x2 - x1);
    } // Returns 0 if no refinement needed, 1 if left refinement, 2 if right refinement, 3 if both refinment


    function needs_refinement(x1, y1, x2, y2, x3, y3, threshold) {
      x1 = +x1;
      y1 = +y1;
      x2 = +x2;
      y2 = +y2;
      x3 = +x3;
      y3 = +y3;
      threshold = +threshold;
      var angle = 0.0;
      angle = +angle_between(x2, y2, x1, y1, x3, y3);
      angle = +min(abs(angle - PI), abs(angle + PI));

      if (angle > threshold) {
        return 3;
      }

      if (y2 != y2) {
        if (y3 == y3) {
          return 3;
        }

        if (y1 == y1) {
          return 3;
        }
      }

      if (y3 != y3) {
        if (y2 == y2) {
          return 3;
        }
      }

      if (y1 != y1) {
        if (y2 == y2) {
          return 3;
        }
      }

      return 0;
    }

    function angles_between(start, end, threshold, aspectRatio) {
      start = start | 0;
      end = end | 0;
      threshold = +threshold;
      aspectRatio = +aspectRatio;
      var p = 0,
          q = 0,
          res = 0,
          indx = 0;

      for (p = start + 2 << 3, q = end - 2 << 3; (p | 0) < (q | 0); p = p + 16 | 0) {
        res = needs_refinement(+values[p - 16 >> 3], +(values[p - 8 >> 3] * aspectRatio), +values[p >> 3], +(values[p + 8 >> 3] * aspectRatio), +values[p + 16 >> 3], +(values[p + 24 >> 3] * aspectRatio), +threshold) | 0;
        indx = p - 4 >> 1 | 0;
        values[indx >> 3] = +(res | 0);
      }
    }

    return {
      angles_between: angles_between,
      point_line_segment_min_distance: point_line_segment_min_distance,
      point_line_segment_min_closest: point_line_segment_min_closest,
      needs_refinement: needs_refinement
    };
  }

  let heap = new ArrayBuffer(0x200000);
  let stdlib = {
    Math: Math,
    Float64Array: Float64Array,
    Infinity: Infinity
  };
  GeometryASMFunctionsCreate(stdlib, null, heap);


  function getLineIntersection(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
    let s1_x, s1_y, s2_x, s2_y;
    s1_x = p1_x - p0_x;
    s1_y = p1_y - p0_y;
    s2_x = p3_x - p2_x;
    s2_y = p3_y - p2_y;
    const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
    const t = (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      // Collision detected
      const intX = p0_x + t * s1_x;
      const intY = p0_y + t * s1_y;
      return [intX, intY];
    }

    return null;
  }

  function lineSegmentIntersectsBox(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y2) {
    // Return the component of the line segment that resides inside a box with boundaries x in (box_x1 .. box_x2), y in
    // (box_y1 .. box_y2), which may potentially be the entire line segment.
    let pt1InBox = box_x1 <= x1 && x1 <= box_x2 && box_y1 <= y1 && y1 <= box_y2;
    let pt2InBox = box_x1 <= x2 && x2 <= box_x2 && box_y1 <= y2 && y2 <= box_y2;

    if (pt1InBox && pt2InBox) {
      // The line segment is entirely in the box
      return [x1, y1, x2, y2];
    } // Infinities cause weird problems with getLineIntersection, so we just approximate them lol


    if (x1 === Infinity) x1 = 1e6;else if (x1 === -Infinity) x1 = -1e6;
    if (x2 === Infinity) x2 = 1e6;else if (x2 === -Infinity) x2 = -1e6;
    if (y1 === Infinity) y1 = 1e6;else if (y1 === -Infinity) y1 = -1e6;
    if (y2 === Infinity) y2 = 1e6;else if (y2 === -Infinity) y2 = -1e6;
    let int1 = getLineIntersection(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y1);
    let int2 = getLineIntersection(x1, y1, x2, y2, box_x2, box_y1, box_x2, box_y2);
    let int3 = getLineIntersection(x1, y1, x2, y2, box_x2, box_y2, box_x1, box_y2);
    let int4 = getLineIntersection(x1, y1, x2, y2, box_x1, box_y2, box_x1, box_y1);

    if (!(int1 || int2 || int3 || int4) && !pt1InBox && !pt2InBox) {
      // If there are no intersections and the points are outside the box, that means none of the segment is inside the
      // box, so we can return null
      return null;
    }

    let intersections = [int1, int2, int3, int4];

    if (!pt1InBox && !pt2InBox) {
      // Both points are outside of the box, but the segment intersects the box. I'm frustrated! We must RESTRICT by finding the pair of intersections with
      // maximal separation. This deals with annoying corner cases. Thankfully this code doesn't need to be too efficient
      // since this is a rare case.
      let maximalSeparationSquared = -1;
      let n_x1, n_y1, n_x2, n_y2;

      for (let i = 0; i < 3; ++i) {
        let i1 = intersections[i];

        if (i1) {
          for (let j = i + 1; j < 4; ++j) {
            let i2 = intersections[j];

            if (i2) {
              let dist = (i2[0] - i1[0]) ** 2 + (i2[1] - i1[1]) ** 2;

              if (dist > maximalSeparationSquared) {
                maximalSeparationSquared = dist;
                n_x1 = i1[0];
                n_y1 = i1[1];
                n_x2 = i2[0];
                n_y2 = i2[1];
              }
            }
          }
        }
      } // Swap the order if necessary. We need the result of this calculation to be in the same order as the points
      // that went in, since this will be used in the dashed line logic.


      if (n_x1 < n_x2 === x1 > x2 || n_y1 < n_y2 === y1 > y2) {
        let tmp = n_x1;
        n_x1 = n_x2;
        n_x2 = tmp;
        tmp = n_y1;
        n_y1 = n_y2;
        n_y2 = tmp;
      }

      return [n_x1, n_y1, n_x2, n_y2];
    }

    if (pt1InBox) {
      for (let i = 0; i < 4; ++i) {
        let intersection = intersections[i];
        if (intersection) return [x1, y1, intersection[0], intersection[1]];
      }
    } else if (pt2InBox) {
      for (let i = 0; i < 4; ++i) {
        let intersection = intersections[i];
        if (intersection) return [intersection[0], intersection[1], x2, y2];
      }
    }

    return [x1, y1, x2, y2];
  }

  /**
   * Compute Math.hypot(x, y), but since all the values of x and y we're using here are not extreme, we don't have to
   * handle overflows and underflows with much accuracy at all. We can thus use the straightforward calculation.
   * @param x {number}
   * @param y {number}
   * @returns {number} hypot(x, y)
   */

  function fastHypot(x, y) {
    return Math.sqrt(x * x + y * y);
  }
  /**
   * The maximum number of vertices to be emitted by getDashedPolyline. This condition is here just to prevent dashed
   * polyline from causing a crash from OOM or just taking forever to finish.
   * @type {number}
   */

  const MAX_DASHED_POLYLINE_VERTICES = 1e7;
  /**
   * Convert a polyline into another polyline, but with dashes. The function periodically yields a number which represents
   * the fraction of which it has completed the calculation. This is useful for asynchronous computations.
   * @param vertices {Array} The vertices of the polyline.
   * @param pen {Pen} The polyline's pen
   * @param box {BoundingBox} The plotting box, used to clip excess portions of the polyline. There could theoretically be
   * an infinite number of dashes in a long vertical asymptote, for example, but this box condition prevents that from
   * being an issue. Portions of the polyline outside the plotting box are simply returned without dashes.
   * @param chunkSize {number} The number of
   * @returns {Array}
   */

  function* getDashedPolyline(vertices, pen, box, chunkSize = 256000) {
    // dashPattern is the pattern of dashes, given as the length (in pixels) of consecutive dashes and gaps.
    // dashOffset is the pixel offset at which to start the dash pattern, beginning at the start of every sub polyline.
    let {
      dashPattern,
      dashOffset
    } = pen; // If the dash pattern is odd in length, concat it to itself, creating a doubled, alternating dash pattern

    if (dashPattern.length % 2 === 1) dashPattern = dashPattern.concat(dashPattern); // The length, in pixels, of the pattern

    const patternLength = dashPattern.reduce((a, b) => a + b); // If the pattern is invalid in some way (NaN values, negative dash lengths, total length less than 2), return the
    // polyline without dashes.

    if (patternLength < 2 || dashPattern.some(dashLen => dashLen < 0) || dashPattern.some(Number.isNaN)) return vertices; // currentIndex is the current position in the dash pattern. currentLesserOffset is the offset within the dash or gap
    // ----    ----    ----    ----    ----    ----    ----  ... etc.
    //      ^
    // If we are there, then currentIndex is 1 and currentLesserOffset is 1.

    let currentIndex = 0,
        currentLesserOffset = 0; // Initialize the value of currentLesserOffset based on dashOffset and dashPattern

    recalculateOffset(0); // The returned dashed vertices

    const result = []; // The plotting box

    const boxX1 = box.x1,
          boxX2 = box.x2,
          boxY1 = box.y1,
          boxY2 = box.y2; // Calculate the value of currentLesserOffset, given the length of the pattern that we have just traversed.

    function recalculateOffset(length) {
      // If there's an absurdly long segment, we just pretend the length is 0 to avoid problems with Infinities/NaNs
      if (length > 1e6) length = 0; // Move length along the dashOffset, modulo the patternLength

      dashOffset += length;
      dashOffset %= patternLength; // It's certainly possible to precompute these sums and use a binary search to find the dash index, but
      // that's unnecessary for dashes with short length

      let sum = 0,
          i = 0,
          lesserOffset = 0;

      for (; i < dashPattern.length; ++i) {
        let dashLength = dashPattern[i]; // Accumulate the length from the start of the pattern to the current dash

        sum += dashLength; // If the dashOffset is within this dash...

        if (dashOffset <= sum) {
          // calculate the lesser offset
          lesserOffset = dashOffset - sum + dashLength;
          break;
        }
      } // Set the current index and lesserOffset


      currentIndex = i;
      currentLesserOffset = lesserOffset;
    } // Generate dashes for the line segment (x1, y1) -- (x2, y2)


    function generateDashes(x1, y1, x2, y2) {
      // length of the segment
      const length = fastHypot(x2 - x1, y2 - y1); // index of where along the dashes we are

      let i = currentIndex; // Length so far of emitted dashes

      let lengthSoFar = 0; // We do this instead of while (true) to prevent the program from crashing

      for (let _ = 0; _ < MAX_DASHED_POLYLINE_VERTICES; _++) {
        // Length of the dash/gap component we need to draw (we subtract currentLesserOffset because that is already drawn)
        const componentLen = dashPattern[i] - currentLesserOffset; // Length when this component ends

        const endingLen = componentLen + lengthSoFar; // Whether we are in a dash

        const inDash = i % 2 === 0;

        if (endingLen <= length) {
          // If the end of the dash/gap occurs before the end of the current segment, we need to continue
          let r = endingLen / length; // if in a gap, this starts the next dash; if in a dash, this ends the dash

          result.push(x1 + (x2 - x1) * r, y1 + (y2 - y1) * r); // If we're ending off a dash, put the gap in

          if (inDash) result.push(NaN, NaN); // Go to the next dash/gap

          ++i;
          i %= dashPattern.length; // Reset the current lesser offset

          currentLesserOffset = 0;
        } else {
          // If we're in a dash, that means we're in the middle of a dash, so we just add the vertex
          if (inDash) result.push(x2, y2);
          break;
        }

        lengthSoFar += componentLen;
      } // Recalculate currentLesserOffset


      recalculateOffset(length);
    } // Where we along on each chunk, which tells us when to yield a progress report


    let chunkPos = 0;
    if (currentIndex % 2 === 0) // We're beginning with a dash, so start it off
      result.push(vertices[0], vertices[1]);

    for (let i = 0; i < vertices.length - 2; i += 2) {
      // For each pair of vertices...
      let x1 = vertices[i];
      let y1 = vertices[i + 1];
      let x2 = vertices[i + 2];
      let y2 = vertices[i + 3];

      if (Number.isNaN(x1) || Number.isNaN(y1)) {
        // At the start of every subpolyline, reset the dash offset
        dashOffset = pen.dashOffset; // Recalculate the initial currentLesserOffset

        recalculateOffset(0); // End off the previous subpolyline

        result.push(NaN, NaN);
        continue;
      } // If the end of the segment is undefined, continue


      if (Number.isNaN(x2) || Number.isNaN(y2)) continue; // Length of the segment

      let length = fastHypot(x2 - x1, y2 - y1); // Find whether the segment intersects the box

      let intersect = lineSegmentIntersectsBox(x1, y1, x2, y2, boxX1, boxY1, boxX2, boxY2); // If the segment doesn't intersect the box, it is entirely outside the box, so we can add its length to pretend
      // like we drew it even though we didn't

      if (!intersect) {
        recalculateOffset(length);
        continue;
      } // Whether (x1, y1) and (x2, y2) are contained within the box


      let pt1Contained = intersect[0] === x1 && intersect[1] === y1;
      let pt2Contained = intersect[2] === x2 && intersect[3] === y2; // If (x1, y1) is contained, fake draw the portion of the line outside of the box

      if (!pt1Contained) recalculateOffset(fastHypot(x1 - intersect[0], y1 - intersect[1]));
      chunkPos++; // Generate dashes

      generateDashes(intersect[0], intersect[1], intersect[2], intersect[3]);
      chunkPos++; // Provide a progress report

      if (chunkPos >= chunkSize) {
        yield i / vertices.length;
        chunkPos = 0;
      }

      if (!pt2Contained) recalculateOffset(fastHypot(x2 - intersect[2], y2 - intersect[3])); //

      if (result.length > MAX_DASHED_POLYLINE_VERTICES) throw new Error("Too many generated vertices in getDashedPolyline.");
    }

    return result;
  }

  const ENDCAP_TYPES = {
    'butt': 0,
    'round': 1,
    'square': 0 // Need to implement

  };
  const JOIN_TYPES = {
    'bevel': 0,
    'miter': 3,
    'round': 1,
    'dynamic': 3
  };

  const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline

  const B = 4 / Math.PI;
  const C = -4 / Math.PI ** 2;

  function fastSin(x) {
    // crude, but good enough for this
    x %= 6.28318530717;
    if (x < -3.14159265) x += 6.28318530717;else if (x > 3.14159265) x -= 6.28318530717;
    return B * x + C * x * (x < 0 ? -x : x);
  }

  function fastCos(x) {
    return fastSin(x + 1.570796326794);
  }

  function fastAtan2(y, x) {
    let abs_x = x < 0 ? -x : x;
    let abs_y = y < 0 ? -y : y;
    let a = abs_x < abs_y ? abs_x / abs_y : abs_y / abs_x;
    let s = a * a;
    let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
    if (abs_y > abs_x) r = 1.57079637 - r;
    if (x < 0) r = 3.14159265 - r;
    if (y < 0) r = -r;
    return r;
  }
  /**
   * Convert an array of polyline vertices into a Float32Array of vertices to be rendered using WebGL.
   * @param vertices {Array} The vertices of the polyline.
   * @param pen {Object} A JSON representation of the pen. Could also be the pen object itself.
   * @param box {BoundingBox} The bounding box of the plot, used to optimize line dashes
   */


  function calculatePolylineVertices(vertices, pen, box) {
    let generator = asyncCalculatePolylineVertices(vertices, pen, box);

    while (true) {
      let ret = generator.next();
      if (ret.done) return ret.value;
    }
  }
  function* asyncCalculatePolylineVertices(vertices, pen, box) {
    if (pen.dashPattern.length === 0) {
      // No dashes to draw
      let generator = convertTriangleStrip(vertices, pen);

      while (true) {
        let ret = generator.next();
        if (ret.done) return ret.value;else yield ret.value;
      }
    } else {
      let gen1 = getDashedPolyline(vertices, pen, box);
      let ret;

      while (true) {
        ret = gen1.next();
        if (ret.done) break;else yield ret.value / 2;
      }

      let gen2 = convertTriangleStrip(ret.value, pen);

      while (true) {
        let ret = gen2.next();
        if (ret.done) return ret.value;else yield ret.value / 2 + 0.5;
      }
    }
  }
  function* convertTriangleStrip(vertices, pen, chunkSize = 256000) {
    if (pen.thickness <= 0 || pen.endcapRes < MIN_RES_ANGLE || pen.joinRes < MIN_RES_ANGLE || vertices.length <= 3) {
      return {
        glVertices: null,
        vertexCount: 0
      };
    }

    let glVertices = [];
    let origVertexCount = vertices.length / 2;
    let th = pen.thickness / 2;
    let maxMiterLength = th / fastCos(pen.joinRes / 2);
    let endcap = ENDCAP_TYPES[pen.endcap];
    let join = JOIN_TYPES[pen.join];

    if (endcap === undefined || join === undefined) {
      throw new Error("Undefined endcap or join.");
    }

    let x1, x2, x3, y1, y2, y3;
    let v1x, v1y, v2x, v2y, v1l, v2l, b1_x, b1_y, scale, dis;
    let chunkPos = 0;

    for (let i = 0; i < origVertexCount; ++i) {
      chunkPos++;

      if (chunkPos >= chunkSize) {
        yield i / origVertexCount;
        chunkPos = 0;
      }

      x1 = i !== 0 ? vertices[2 * i - 2] : NaN; // Previous vertex

      x2 = vertices[2 * i]; // Current vertex

      x3 = i !== origVertexCount - 1 ? vertices[2 * i + 2] : NaN; // Next vertex

      y1 = i !== 0 ? vertices[2 * i - 1] : NaN; // Previous vertex

      y2 = vertices[2 * i + 1]; // Current vertex

      y3 = i !== origVertexCount - 1 ? vertices[2 * i + 3] : NaN; // Next vertex

      if (isNaN(x2) || isNaN(y2)) {
        glVertices.push(NaN, NaN);
      }

      if (isNaN(x1) || isNaN(y1)) {
        // starting endcap
        v2x = x3 - x2;
        v2y = y3 - y2;
        v2l = fastHypot(v2x, v2y);

        if (v2l < 1e-8) {
          v2x = 1;
          v2y = 0;
        } else {
          v2x /= v2l;
          v2y /= v2l;
        }

        if (isNaN(v2x) || isNaN(v2y)) {
          continue;
        } // undefined >:(


        if (endcap === 1) {
          // rounded endcap
          let theta = fastAtan2(v2y, v2x) + Math.PI / 2;
          let steps_needed = Math.ceil(Math.PI / pen.endcapRes);
          let o_x = x2 - th * v2y,
              o_y = y2 + th * v2x;

          for (let i = 1; i <= steps_needed; ++i) {
            let theta_c = theta + i / steps_needed * Math.PI;
            glVertices.push(x2 + th * fastCos(theta_c), y2 + th * fastSin(theta_c), o_x, o_y);
          }

          continue;
        } else {
          // no endcap
          glVertices.push(x2 + th * v2y, y2 - th * v2x, x2 - th * v2y, y2 + th * v2x);
          continue;
        }
      }

      if (isNaN(x3) || isNaN(y3)) {
        // ending endcap
        v1x = x2 - x1;
        v1y = y2 - y1;
        v1l = v2l;

        if (v1l < 1e-8) {
          v1x = 1;
          v1y = 0;
        } else {
          v1x /= v1l;
          v1y /= v1l;
        }

        if (isNaN(v1x) || isNaN(v1y)) {
          continue;
        } // undefined >:(


        glVertices.push(x2 + th * v1y, y2 - th * v1x, x2 - th * v1y, y2 + th * v1x);

        if (endcap === 1) {
          let theta = fastAtan2(v1y, v1x) + 3 * Math.PI / 2;
          let steps_needed = Math.ceil(Math.PI / pen.endcapRes);
          let o_x = x2 - th * v1y,
              o_y = y2 + th * v1x;

          for (let i = 1; i <= steps_needed; ++i) {
            let theta_c = theta + i / steps_needed * Math.PI;
            glVertices.push(x2 + th * fastCos(theta_c), y2 + th * fastSin(theta_c), o_x, o_y);
          }
        }

        continue;
      } // all vertices are defined, time to draw a joinerrrrr


      if (join === 2 || join === 3) {
        // find the two angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3
        v1x = x1 - x2;
        v1y = y1 - y2;
        v2x = x3 - x2;
        v2y = y3 - y2;
        v1l = v2l;
        v2l = fastHypot(v2x, v2y);
        b1_x = v2l * v1x + v1l * v2x;
        b1_y = v2l * v1y + v1l * v2y;
        scale = 1 / fastHypot(b1_x, b1_y);

        if (scale === Infinity || scale === -Infinity) {
          b1_x = -v1y;
          b1_y = v1x;
          scale = 1 / fastHypot(b1_x, b1_y);
        }

        b1_x *= scale;
        b1_y *= scale;
        scale = th * v1l / (b1_x * v1y - b1_y * v1x);

        if (join === 2 || Math.abs(scale) < maxMiterLength) {
          // if the length of the miter is massive and we're in dynamic mode, we exit this if statement and do a rounded join
          b1_x *= scale;
          b1_y *= scale;
          glVertices.push(x2 - b1_x, y2 - b1_y, x2 + b1_x, y2 + b1_y);
          continue;
        }
      }

      v2x = x3 - x2;
      v2y = y3 - y2;
      dis = fastHypot(v2x, v2y);

      if (dis < 0.001) {
        v2x = 1;
        v2y = 0;
      } else {
        v2x /= dis;
        v2y /= dis;
      }

      v1x = x2 - x1;
      v1y = y2 - y1;
      dis = fastHypot(v1x, v1y);

      if (dis === 0) {
        v1x = 1;
        v1y = 0;
      } else {
        v1x /= dis;
        v1y /= dis;
      }

      glVertices.push(x2 + th * v1y, y2 - th * v1x, x2 - th * v1y, y2 + th * v1x);

      if (join === 1 || join === 3) {
        let a1 = fastAtan2(-v1y, -v1x) - Math.PI / 2;
        let a2 = fastAtan2(v2y, v2x) - Math.PI / 2; // if right turn, flip a2
        // if left turn, flip a1

        let start_a, end_a;

        if (mod(a1 - a2, 2 * Math.PI) < Math.PI) {
          // left turn
          start_a = Math.PI + a1;
          end_a = a2;
        } else {
          start_a = Math.PI + a2;
          end_a = a1;
        }

        let angle_subtended = mod(end_a - start_a, 2 * Math.PI);
        let steps_needed = Math.ceil(angle_subtended / pen.joinRes);

        for (let i = 0; i <= steps_needed; ++i) {
          let theta_c = start_a + angle_subtended * i / steps_needed;
          glVertices.push(x2 + th * fastCos(theta_c), y2 + th * fastSin(theta_c), x2, y2);
        }
      }

      glVertices.push(x2 + th * v2y, y2 - th * v2x, x2 - th * v2y, y2 + th * v2x);
    }

    return {
      glVertices: new Float32Array(glVertices),
      vertexCount: glVertices.length / 2
    };
  }

  function _flattenVec2ArrayInternal(arr) {
    const out = [];

    for (let i = 0; i < arr.length; ++i) {
      let item = arr[i];

      if (item === null) {
        out.push(NaN, NaN);
      } else if (item.x !== undefined && item.y !== undefined) {
        out.push(item.x, item.y);
      } else {
        if (typeof item === "number") out.push(item);else throw new TypeError("Unknown item ".concat(item, " at index ").concat(i, " in Vec2 array equivalent"));
      }
    }

    return out;
  } // Given some arbitrary array of Vec2s, turn it into the regularized format [x1, y1, x2, y2, ..., xn, yn]. The end of
  // one polyline and the start of another is done by one pair of numbers being NaN, NaN.


  function flattenVec2Array(arr) {
    if (isTypedArray(arr)) return arr;

    for (let i = 0; i < arr.length; ++i) {
      if (typeof arr[i] !== "number") return _flattenVec2ArrayInternal(arr);
    }

    return arr;
  }
  /**
   * A good test element: we give it a pen of some sort and it should draw a polyline with the given vertices. The vertices
   * should be in CSS pixels. So we can extensively comment this to understand how this will work.
   */


  class PolylineElement extends Element {
    constructor(params = {}) {
      super(params);
      this.set({
        vertices: [-1, 0.5, 1, 0.2],
        pen: new Pen()
      });
    }

    update() {
      if (this.updateStage === -1) return;
      /**
       * COMPUTE THE COMPUTED PROPS
       */

      const {
        props,
        computedProps
      } = this; // Inherit needed computed props, in this case sceneDimensions, which will be given to the polyline program. Of
      // course in the future this information could just be passed through the renderer, but also note that giving
      // the bounding rectangle of the screen allows us to cull vertices/parts of the line that are offscreen.

      this._defaultInheritProps(); // Calculate the other computed properties, specific to this element, namely vertices and pen. They are just
      // forwarded from the given properties, except they are preprocessed into a uniform format. For example, the
      // vertices may be given as [Vec2(3, 4), Vec2(1, 5), ..., Vec2(150, 302)], while the internal function that
      // actually calculates the geometries of the polyline (namely, calculatePolylineVertices) needs a flattened array
      // of floats. There is indeed a small overhead to checking over all the points, but this overhead is small in
      // comparison to other computations.


      if (props.needsUpdate) {
        if (props.hasChanged("vertices")) computedProps.set("vertices", flattenVec2Array(props.get("vertices")));
        if (props.hasChanged("pen")) computedProps.set("pen", Pen.fromObj(props.get("pen"))); // At this point, the props have been taken care of and we can mark props as not needing an update.

        props.needsUpdate = false;
      } // We need to update the internal rendering data if the relevant computed properties have changed. Note that "pen"
      // may not have changed by reference, but changed by value; same with vertices, actually.


      if (computedProps.needsUpdate) {
        const {
          internal
        } = this;
        const pen = computedProps.get("pen");
        const vertices = computedProps.get("vertices");
        const sceneDimensions = computedProps.get("sceneDimensions");
        if (!vertices || vertices.length < 4 || !sceneDimensions) internal.glVertices = null; // Consists of { glVertices: Float32Array( ... ), vertexCount: n }.

        internal.geometry = calculatePolylineVertices(vertices, pen, sceneDimensions.getBBox());
        internal.color = pen.color; // Scaling vector to transform CSS pixels into clip space. We use width and height instead of canvasWidth and
        // canvasHeight.

        internal.xy_scale = [2 / sceneDimensions.width, -2 / sceneDimensions.height];
      }

      this.updateStage = -1;
    }

    getRenderingInstructions() {
      return renderer => {
        var _glManager$getProgram;

        const {
          gl,
          glManager
        } = renderer;
        const {
          internal
        } = this;
        const tileLayerProgram = (_glManager$getProgram = glManager.getProgram("Polyline")) !== null && _glManager$getProgram !== void 0 ? _glManager$getProgram : glManager.createProgram("Polyline", "attribute vec2 v_position;\n        \n        uniform vec2 xy_scale;\n        vec2 displace = vec2(-1, 1);\n         \n        void main() {\n            gl_Position = vec4(v_position * xy_scale + displace, 0, 1);\n        }", "\n        precision highp float;\n        uniform vec4 color;\n        \n        void main() {\n          gl_FragColor = color;\n        }", ["v_position"], ["color", "xy_scale"]);
        const buf = glManager.getBuffer(this.id);
        const {
          glVertices,
          vertexCount
        } = internal.geometry;
        gl.useProgram(tileLayerProgram.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, glVertices, gl.STATIC_DRAW);
        const vPosition = tileLayerProgram.attribs.vPosition;
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
        const color = this.internal.color;
        gl.uniform4f(tileLayerProgram.uniforms.color, color.r / 255, color.g / 255, color.b / 255, color.a / 255);
        gl.uniform2fv(tileLayerProgram.uniforms.xy_scale, internal.xy_scale);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
      };
    }

  }

  exports.BoundingBox = BoundingBox;
  exports.Element = Element;
  exports.ElementProps = ElementProps;
  exports.Eventful = Eventful;
  exports.FP = fp_manip;
  exports.Group = Group;
  exports.Pen = Pen;
  exports.PolylineElement = PolylineElement;
  exports.RealFunctions = RealFunctions;
  exports.Scene = Scene;
  exports.WebGLRenderer = WebGLRenderer;
  exports._forwardChangedProps = _forwardChangedProps;
  exports._forwardPropsByNameDict = _forwardPropsByNameDict;
  exports._inheritAllChangedPropsFromBase = _inheritAllChangedPropsFromBase;
  exports._inheritAllInheritablePropsFromBase = _inheritAllInheritablePropsFromBase;
  exports._inheritAllPropsFromBase = _inheritAllPropsFromBase;
  exports._inheritChangedInheritablePropsFromBase = _inheritChangedInheritablePropsFromBase;
  exports.asyncCalculatePolylineVertices = asyncCalculatePolylineVertices;
  exports.asyncDigest = asyncDigest;
  exports.boundingBoxTransform = boundingBoxTransform;
  exports.calculatePolylineVertices = calculatePolylineVertices;
  exports.closestRational = closestRational;
  exports.coatBolus = coatBolus;
  exports.convertTriangleStrip = convertTriangleStrip;
  exports.doubleToRational = doubleToRational;
  exports.intersectBoundingBoxes = intersectBoundingBoxes;
  exports.syncDigest = syncDigest;
  exports.testBolus = testBolus;
  exports.utils = utils;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
