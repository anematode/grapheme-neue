(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.Grapheme = {}));
}(this, function (exports) { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

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

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _possibleConstructorReturn(self, call) {
    if (call && (typeof call === "object" || typeof call === "function")) {
      return call;
    }

    return _assertThisInitialized(self);
  }

  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();

    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived),
          result;

      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;

        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }

      return _possibleConstructorReturn(this, result);
    };
  }

  function _superPropBase(object, property) {
    while (!Object.prototype.hasOwnProperty.call(object, property)) {
      object = _getPrototypeOf(object);
      if (object === null) break;
    }

    return object;
  }

  function _get(target, property, receiver) {
    if (typeof Reflect !== "undefined" && Reflect.get) {
      _get = Reflect.get;
    } else {
      _get = function _get(target, property, receiver) {
        var base = _superPropBase(target, property);

        if (!base) return;
        var desc = Object.getOwnPropertyDescriptor(base, property);

        if (desc.get) {
          return desc.get.call(receiver);
        }

        return desc.value;
      };
    }

    return _get(target, property, receiver || target);
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _iterableToArrayLimit(arr, i) {
    if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _createForOfIteratorHelper(o, allowArrayLike) {
    var it;

    if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;

        var F = function () {};

        return {
          s: F,
          n: function () {
            if (i >= o.length) return {
              done: true
            };
            return {
              done: false,
              value: o[i++]
            };
          },
          e: function (e) {
            throw e;
          },
          f: F
        };
      }

      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var normalCompletion = true,
        didErr = false,
        err;
    return {
      s: function () {
        it = o[Symbol.iterator]();
      },
      n: function () {
        var step = it.next();
        normalCompletion = step.done;
        return step;
      },
      e: function (e) {
        didErr = true;
        err = e;
      },
      f: function () {
        try {
          if (!normalCompletion && it.return != null) it.return();
        } finally {
          if (didErr) throw err;
        }
      }
    };
  }

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
  var isBigEndian = function () {
    var array = new Uint8Array(4);
    var view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
  }();

  if (isBigEndian) throw new Error('only works on little-endian systems; your system is mixed- or big-endian.'); // Used for bit-level manipulation of floats

  var floatStore = new Float64Array(1);
  var intView = new Uint32Array(floatStore.buffer);
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

  var POSITIVE_NORMAL_MIN = 2.2250738585072014e-308; // The first negative normal number

  var NEGATIVE_NORMAL_MAX = -POSITIVE_NORMAL_MIN;
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
      var tmp = x1;
      x1 = x2;
      x2 = tmp;
    }

    var _frExp = frExp(x1),
        _frExp2 = _slicedToArray(_frExp, 2),
        x1man = _frExp2[0],
        x1exp = _frExp2[1];

    var _frExp3 = frExp(x2),
        _frExp4 = _slicedToArray(_frExp3, 2),
        x2man = _frExp4[0],
        x2exp = _frExp4[1];

    return (x2man - x1man) * Math.pow(2, 53) + (x2exp - x1exp) * Math.pow(2, 52);
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
      var field = 1 << exp + 1074;

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
    var bits = 0;

    if (n !== 0) {
      var x = n; // Suck off groups of 16 bits, then 8 bits, et cetera

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
    var bits = countTrailingZeros(intView[0]);

    if (bits === 32) {
      var secondWordCount = countTrailingZeros(_getMantissaHighWord());
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
    var bits = Math.clz32(_getMantissaHighWord()) - 12; // subtract the exponent zeroed part

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

    var exp = getExponent(x) + 1; // Denormal

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
      var _rationalExp = rationalExp(-x),
          _rationalExp2 = _slicedToArray(_rationalExp, 3),
          _num = _rationalExp2[0],
          _den = _rationalExp2[1],
          _exp = _rationalExp2[2];

      return [-_num, _den, _exp];
    }

    if (x === 0 || !Number.isFinite(x)) return [x, 1, 0]; // Decompose into frac * 2 ^ exp

    var _frExp5 = frExp(x),
        _frExp6 = _slicedToArray(_frExp5, 2),
        frac = _frExp6[0],
        exp = _frExp6[1]; // This tells us the smallest power of two which frac * (2 ** shift) is an integer, which is the denominator
    // of the dyadic rational corresponding to x


    var den = pow2(53 - mantissaCtz(frac));
    var num = frac * den;
    return [num, den, exp];
  }

  var fp_manip = /*#__PURE__*/Object.freeze({
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

  var id = 0;
  /** Returns a single unique positive integer */

  function getID() {
    return ++id;
  }
  function benchmark(callback) {
    var iterations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
    var output = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : console.log;
    var start = performance.now();

    for (var i = 0; i < iterations; ++i) {
      callback(i);
    }

    var duration = performance.now() - start;
    output("Function ".concat(callback.name, " took ").concat(duration / iterations, " ms per call."));
  }
  function assertRange(num, min, max) {
    var variableName = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'Unknown variable';

    if (num < min || num > max || Number.isNaN(num)) {
      throw new RangeError("".concat(variableName, " must be in the range [").concat(min, ", ").concat(max, "]"));
    }
  }

  var utils = /*#__PURE__*/Object.freeze({
    getID: getID,
    benchmark: benchmark,
    assertRange: assertRange
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
      var tmp = a;
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
  var LANCZOS_COUNT = 7;
  var LANCZOS_COEFFICIENTS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; // 1, 1, 2, 6, ...

  var INTEGER_FACTORIALS = [1]; // Populate INTEGER_FACTORIALS

  var fact = 1;

  for (var i = 1;; ++i) {
    fact *= i;

    if (fact === Infinity) {
      break;
    }

    INTEGER_FACTORIALS.push(fact);
  }

  var INTEGER_FACTORIAL_LEN = INTEGER_FACTORIALS.length;
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

      var z = LANCZOS_COEFFICIENTS[0];

      for (var _i = 1; _i < LANCZOS_COUNT + 2; ++_i) {
        z += LANCZOS_COEFFICIENTS[_i] / (x + _i);
      }

      var t = x + LANCZOS_COUNT + 0.5;
      var sqrt2Pi = Math.sqrt(2 * Math.PI); // for performance, since Math.sqrt can be overwritten

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
      var reflected = lnGamma(1 - x);
      var lnPi = Math.log(Math.PI); // for performance, since Math.log can be overwritten

      return lnPi - Math.log(Math.sin(Math.PI * x)) - reflected;
    } else {
      // See above for explanation
      x -= 1;
      var z = LANCZOS_COEFFICIENTS[0];

      for (var _i2 = 1; _i2 < LANCZOS_COUNT + 2; ++_i2) {
        z += LANCZOS_COEFFICIENTS[_i2] / (x + _i2);
      }

      var t = x + LANCZOS_COUNT + 0.5;
      var lnSqrt2Pi = Math.log(2 * Math.PI) / 2; // for performance, since Math.log can be overwritten

      return lnSqrt2Pi + Math.log(t) * (x + 0.5) - t + Math.log(z);
    }
  }

  /**
   * Return the closest rational number p/q to x where 1 <= q <= maxDenominator and |p| <= maxNumerator. The algorithm is
   * described in Grapheme Theory, but the basic idea is that we express the given floating-point number as an exact
   * fraction, then expand its continued fraction and use it to find the best approximation.
   * @param x {number} The number to find rational numbers near
   * @param maxDenominator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
   * @param maxNumerator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
   * @returns {number[]} A three-element array [ p, q, error ], where error is abs(x - p/q) as calculated by JS
   */

  function closestRational(x, maxDenominator) {
    var maxNumerator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Number.MAX_SAFE_INTEGER;

    if (x < 0) {
      var _closestRational = closestRational(-x, maxDenominator, maxNumerator),
          _closestRational2 = _slicedToArray(_closestRational, 3),
          p = _closestRational2[0],
          q = _closestRational2[1],
          error = _closestRational2[2];

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
      var rnd = Math.min(maxNumerator, Math.round(x));
      return [rnd, 1, Math.abs(rnd - x)];
    }

    if (x > maxNumerator) {
      // Closest we can get, unfortunately
      return [maxNumerator, 1, Math.abs(maxNumerator - x)];
    } // Floor and fractional part of x


    var flr = Math.floor(x); // Guaranteed to be in (0, 1) and to be exact

    var frac = x - flr; // frac = exactFracNum / (exactFracDenWithoutExp * 2 ^ exp) = exactN / exactD (last equality is by definition); exp >= 0 guaranteed

    var _rationalExp = rationalExp(frac),
        _rationalExp2 = _slicedToArray(_rationalExp, 3),
        exactFracNum = _rationalExp2[0],
        exactFracDenWithoutExp = _rationalExp2[1],
        expN = _rationalExp2[2];

    var exp = -expN; // exactFracDen = exactD; exactFracNum = exactN. Note that x * 2^n is always exactly representable, so exactFracDen
    // is exact even though it may be greater than MAX_SAFE_INTEGER. Occasionally, this will overflow to Infinity, but
    // that is okay; we just return 0.

    var exactFracDen = exactFracDenWithoutExp * pow2(exp);
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

    var modDN = exactFracDen % exactFracNum;
    var flrDN = Math.round(exactFracDen / exactFracNum - modDN / exactFracNum);
    var contFracGeneratorNum = exactFracNum;
    var contFracGeneratorDen = modDN; // Define a recursive function d(i+1) = c_(i+1) * d(i) + d(i-1), where c_i is the ith term (indexed from 1) of the
    // continued fraction, as well as n(i+1) = c_(i+1) * n(i) + n(i-1). Then n(i+1) / d(i+1) is indeed the (i+1)th
    // convergent of the continued fraction. Thus, we store the previous two numerators and denominators, which is all we
    // need to calculate the next convergent.
    // n_(i-1), n_i, d_(i-1), d_i, starting at i = 1

    var nnm1 = 1;
    var nn = flr;
    var dnm1 = 0;
    var dn = 1; // Store the best numerators and denominators found so far

    var bestN = Math.round(x);
    var bestD = 1; // Same indexing variable as Grapheme Theory. In case there's a bug I don't know about; it should terminate in < 55 steps

    for (var i = 2; i < 100; ++i) {
      // term is equivalent to c_i from Grapheme theory
      var term = void 0,
          rem = void 0;

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


      var nnp1 = term * nn + nnm1;
      var dnp1 = term * dn + dnm1; // Having computed the next convergent, we see if it meets our criteria. If it does not, we see whether a reduction
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
        var maxTermR = Math.floor(Math.min((maxNumerator - nnm1) / nn, (maxDenominator - dnm1) / dn));
        var minTermR = term / 2;

        if (maxTermR >= minTermR) {
          // reduced semiconvergent (maybe) possible
          nnp1 = maxTermR * nn + nnm1;
          dnp1 = maxTermR * dn + dnm1;

          if (maxTermR > minTermR) {
            bestN = nnp1;
            bestD = dnp1;
          } else {
            // rare special case. We check whether bestN/bestD is a BETTER convergent than this, and select the better one.
            var reduced = nnp1 / dnp1;
            var oldBest = bestN / bestD;

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

    var quot = bestN / bestD;
    return [bestN, bestD, Math.abs(quot - x)];
  } // [...Array(53 + 25).keys()].map(n => { n = n - 52; return Math.floor(Math.min(Math.PI * 2 ** (26 - n/2) / 300, Number.MAX_SAFE_INTEGER)) })

  var dnLookupTable = [47161585013522, 33348276574567, 23580792506761, 16674138287283, 11790396253380, 8337069143641, 5895198126690, 4168534571820, 2947599063345, 2084267285910, 1473799531672, 1042133642955, 736899765836, 521066821477, 368449882918, 260533410738, 184224941459, 130266705369, 92112470729, 65133352684, 46056235364, 32566676342, 23028117682, 16283338171, 11514058841, 8141669085, 5757029420, 4070834542, 2878514710, 2035417271, 1439257355, 1017708635, 719628677, 508854317, 359814338, 254427158, 179907169, 127213579, 89953584, 63606789, 44976792, 31803394, 22488396, 15901697, 11244198, 7950848, 5622099, 3975424, 2811049, 1987712, 1405524, 993856, 702762, 496928, 351381, 248464, 175690, 124232, 87845, 62116, 43922, 31058, 21961, 15529, 10980, 7764, 5490, 3882, 2745, 1941, 1372, 970, 686, 485, 343, 242, 171, 121]; // Internal function used to convert a double to a rational; does the actual work.

  function _doubleToRational(d) {
    if (d === 0) {
      return [0, 1];
    } else if (Number.isInteger(d)) {
      return [d, 1];
    }

    var negative = d < 0;
    d = Math.abs(d); // Early exit conditions

    if (d <= 1.1102230246251565e-16
    /** 2^-53 */
    || d > 67108864
    /** 2^26 */
    || !Number.isFinite(d)) {
      return [NaN, NaN];
    } // Guaranteed that d > 0 and is finite, and that its exponent n is in the range [-52, 25] inclusive.


    var exp = getExponent(d); // We now look up the corresponding value of d_n, as explained in Grapheme Theory. It is offset by 52 because arrays
    // start from 0

    var dn = dnLookupTable[exp + 52]; // We find the nearest rational number that satisfies our requirements

    var _closestRational3 = closestRational(d, dn, Number.MAX_SAFE_INTEGER),
        _closestRational4 = _slicedToArray(_closestRational3, 3),
        p = _closestRational4[0],
        q = _closestRational4[1],
        err = _closestRational4[2]; // Return the fraction if close enough, but rigorously so (see Theory)


    if (err <= pow2(exp - 52)) return [negative ? -p : p, q];
    return [NaN, NaN];
  } // Cached values for doubleToRational


  var lastDoubleToRationalArg = 0;
  var lastDoubleToRationalRes = [0, 1];
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

  function doubleToRational(d) {
    var cache = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    if (d === lastDoubleToRationalArg) return lastDoubleToRationalRes;

    var res = _doubleToRational(d);

    if (cache) {
      lastDoubleToRationalRes = res;
      lastDoubleToRationalArg = d;
    }

    return res;
  }

  function powRational(a, c, d) {
    // Simple return cases
    if (d === 0 || Number.isNaN(c) || Number.isNaN(d) || !Number.isInteger(c) || !Number.isInteger(d) || Number.isNaN(a)) {
      return NaN;
    }

    if (a === 0) return 0;
    var evenDenom = d % 2 === 0;
    var evenNumer = c % 2 === 0;
    if (evenDenom && a < 0) return NaN;

    if (d < 0) {
      c = -c;
      d = -d;
    } // Now we know that a is not NaN, c is an integer, and d is a nonzero positive integer. Also, the answer is not NaN.


    var mag = Math.pow(Math.abs(a), c / d);

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
    var _doubleToRational = doubleToRational(b),
        _doubleToRational2 = _slicedToArray(_doubleToRational, 2),
        num = _doubleToRational2[0],
        den = _doubleToRational2[1]; // deemed irrational


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

  var RealFunctions = Object.freeze({
    add: add,
    divide: divide,
    multiply: multiply,
    subtract: subtract,
    gcd: gcd,
    gamma: gamma,
    lnGamma: lnGamma,
    factorial: factorial,
    pow: pow
  });

  /**
   * A base class to use for event listeners and the like. Supports things like addEventListener(eventName, callback),
   * triggerEvent(name, ?data), removeEventListener( ... ), removeEventListeners(?name). Listeners are called with
   * data and this as parameters. If the listener returns true, the event does not propagate to any other listeners.
   * If a field "children" is found in this class, it will propagate the event to children. If a field
   * "triggerChildrenFirst" is found, its boolean value will determine whether this class's listeners are called first,
   * or its children's listeners are called. Children which are not instances of Eventful will not have their triggerEvent
   * method called.
   */
  var Eventful = /*#__PURE__*/function () {
    function Eventful() {
      _classCallCheck(this, Eventful);

      _defineProperty(this, "_eventListeners", new Map());
    }

    _createClass(Eventful, [{
      key: "addEventListener",

      /**
       * Register an event listener to a given event name. It will be given lower priority than the ones that came before.
       * The callbacks will be given a single parameter "data".
       * @param eventName {string} The name of the event
       * @param callback {function|Array} The callback(s) to register
       * @returns {Eventful} Returns self (for chaining)
       */
      value: function addEventListener(eventName, callback) {
        if (Array.isArray(callback)) {
          var _iterator = _createForOfIteratorHelper(callback),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var c = _step.value;
              this.addEventListener(eventName, c);
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }

          return this;
        } else if (typeof callback === "function") {
          if (typeof eventName !== "string" || !eventName) throw new TypeError("Invalid event name");

          var listeners = this._eventListeners.get(eventName);

          if (!listeners) {
            listeners = [];

            this._eventListeners.set(eventName, listeners);
          }

          if (!listeners.includes(callback)) listeners.push(callback);
          return this;
        } else throw new TypeError("Invalid callback");
      }
      /**
       * Get the event listeners under "eventName"
       * @param eventName {string} Name of the event whose listeners we want
       * @returns {Array<function>}
       */

    }, {
      key: "getEventListeners",
      value: function getEventListeners(eventName) {
        var _this$_eventListeners, _this$_eventListeners2;

        return (_this$_eventListeners = (_this$_eventListeners2 = this._eventListeners.get(e)) === null || _this$_eventListeners2 === void 0 ? void 0 : _this$_eventListeners2.slice()) !== null && _this$_eventListeners !== void 0 ? _this$_eventListeners : [];
      }
      /**
       * Whether there are any event listeners registered for the given name
       * @param eventName
       * @returns {boolean} Whether any listeners are registered for that event
       */

    }, {
      key: "hasEventListenersFor",
      value: function hasEventListenersFor(eventName) {
        return this._eventListeners.has(eventName);
      }
      /**
       * Remove an event listener from the given event. Fails silently if that listener is not registered.
       * @param eventName {string} The name of the event
       * @param callback {function} The callback to remove
       * @returns {Eventful} Returns self (for chaining)
       */

    }, {
      key: "removeEventListener",
      value: function removeEventListener(eventName, callback) {
        if (Array.isArray(callback)) {
          var _iterator2 = _createForOfIteratorHelper(callback),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var c = _step2.value;
              this.removeEventListener(eventName, c);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }

          return this;
        }

        var listeners = this._eventListeners.get(eventName);

        if (listeners) {
          var index = listeners.indexOf(callback);
          if (index !== -1) listeners.splice(index, 1);
        }

        if (listeners.length === 0) this._eventListeners.delete(eventName);
        return this;
      }
      /**
       * Remove all event listeners for a given event. Fails silently if there are no listeners registered for that event.
       * @param eventName {string} The name of the event whose listeners should be cleared
       * @returns {Eventful} Returns self (for chaining)
       */

    }, {
      key: "removeEventListeners",
      value: function removeEventListeners(eventName) {
        this._eventListeners.delete(eventName);

        return this;
      }
      /**
       * Trigger the listeners registered under an event name, passing (data, this, eventName) to each. Returns true if
       * some listener returned true, stopping propagation; returns false otherwise
       * @param eventName {string} Name of the event to be triggered
       * @param data {any} Optional data parameter to be passed to listeners
       * @returns {boolean} Whether any listener stopped propagation
       */

    }, {
      key: "triggerEvent",
      value: function triggerEvent(eventName, data) {
        var _this = this;

        // Trigger only this element's listeners
        var triggerListeners = function triggerListeners() {
          var listeners = _this._eventListeners.get(eventName);

          if (listeners) {
            for (var i = 0; i < listeners.length; ++i) {
              if (listeners[i](data, _this, eventName)) return true;
            }
          }

          return false;
        }; // Trigger all the children


        var triggerChildren = function triggerChildren() {
          var children = _this.children;
          if (children.length === 0) return false;

          for (var i = 0; i < children.length; ++i) {
            var child = children[i];

            if (child.triggerEvent) {
              if (child.triggerEvent(eventName, data)) return true;
            }
          }

          return false;
        }; // For Eventfuls with children


        if (this.children) {
          var triggerChildrenFirst = !!this.triggerChildrenFirst;

          if (triggerChildrenFirst) {
            if (triggerChildren()) return true;
          }

          if (triggerListeners()) return true;

          if (!triggerChildrenFirst) {
            if (triggerChildren()) return true;
          }
        } else {
          // Other case
          if (triggerListeners()) return true;
        }

        return false;
      }
    }]);

    return Eventful;
  }();

  /**
   * The base class for all elements in a Grapheme canvas. Grapheme uses a similar style to THREE.js: elements exist in a
   * tree structure. For each call to the plot's render() function, the tree is traversed, and any elements which are
   * visible and marked for updating (via markUpdate()) have their _update() function called with <i>updateInfo</i> as a
   * single parameter. The order of updating is guaranteed to be the same as precedence, and <i>_update()</i> should be a
   * generator function, to allow for both synchronous and asynchronous updating. Once finished updating, the elements are
   * traversed again and rendered. Similarly to _update(), _render() is a generator function to allow for asynchronous
   * rendering. Unlike _update(), however, two plots in the same universe cannot be rendered asynchronously simultaneously.
   * It would be annoying to have to copy the canvas, buffers, and the GL state every time when switching between plots.
   * Thus, only one plot may have control over the canvas at a time.
   */

  var Element = /*#__PURE__*/function (_Eventful) {
    _inherits(Element, _Eventful);

    var _super = _createSuper(Element);

    /**
     * Abbreviated form for identifying elements of this class; subclasses may define this differently
     * @type {string}
     */

    /**
     * Construct a new Grapheme element.
     * @param params {Object} Parameters
     * @param params.precedence {number} The drawing precedence of this object
     * @param params.id {string} The id of this element (will be randomly generated if not provided)
     */
    function Element() {
      var _this;

      var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          _ref$precedence = _ref.precedence,
          precedence = _ref$precedence === void 0 ? 0 : _ref$precedence,
          _ref$id = _ref.id,
          id = _ref$id === void 0 ? '' : _ref$id;

      _classCallCheck(this, Element);

      _this = _super.call(this);
      /**
       * A unique ID associated with this element to disambiguate it from other elements, and to be used in things like
       * WebGL buffer names. May be defined in params
       * @type {string}
       * @private
       */

      _this.id = id ? id + '' : _this.constructor.abbrName + "-" + getID();
      /**
       * Whether this element needs to be updated. This can be marked using the function markUpdate(). Updating occurs
       * before rendering.
       * @type {boolean}
       * @public
       */

      _this.needsUpdate = false;
      /**
       * The parent of this element (there can be only one)
       * @type {Element}
       * @public
       */

      _this.parent = null;
      /**
       * The plot associated with the element (there can be only one)
       * @type {Plot}
       * @public
       */

      _this.plot = null;
      /**
       * The order in which this element will be drawn. Two given elements, e1 and e2, who are children of the same element,
       * will have e1 drawn first before e2 is drawn if e1.precedence < e2.precedence. The same thing applies to updating;
       * e1 will be updated before e2 is updated
       * @type {number}
       * @public
       */

      _this.precedence = precedence;
      /**
       * Whether this element is visible. If the element is marked as invisible, it will not be updated OR rendered;
       * however, needsUpdate will remain unmodified and events will still propagate
       * @type {boolean}
       * @public
       */

      _this.visible = true;
      return _this;
    }
    /**
     * Sets the plot of this element, as well as any children, to the given plot
     * @param plot {Plot}
     */


    _createClass(Element, [{
      key: "_setPlot",
      value: function _setPlot(plot) {
        this.plot = plot;
      }
      /**
       * How many children this element has.
       * @returns {number} 0; no children
       */

    }, {
      key: "childCount",
      value: function childCount() {
        return 0;
      }
      /**
       * Destroy this element, cleaning up its WebGL resources (and potentially releasing handles to other stuff), and
       * removing it as a child; its children will also be destroyed
       */

    }, {
      key: "destroy",
      value: function destroy() {
        this.removeSelf();
      }
      /**
       * Whether this has any children.
       * @returns {boolean} False; will never have any children
       */

    }, {
      key: "hasChildren",
      value: function hasChildren() {
        return false;
      }
      /**
       * Mark the element as needing to be updated at the next render call.
       */

    }, {
      key: "markUpdate",
      value: function markUpdate() {
        this.needsUpdate = true;
      }
      /**
       * Remove this element from its parent
       * @returns {Element} Returns itself (for chaining)
       */

    }, {
      key: "removeSelf",
      value: function removeSelf() {
        if (this.parent) this.parent.remove(this);
        this.plot = null;
        this.parent = null;
        return this;
      }
    }]);

    return Element;
  }(Eventful);

  _defineProperty(Element, "abbrName", "element");

  var Group = /*#__PURE__*/function (_Element) {
    _inherits(Group, _Element);

    var _super = _createSuper(Group);

    /**
     * Construct a new Grapheme group.
     * @param params {Object} Parameters
     * @param params.precedence {number} The drawing precedence of this object
     * @param params.id {string} The id of this element (will be randomly generated if not provided)
     */
    function Group() {
      var _this;

      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      _classCallCheck(this, Group);

      _this = _super.call(this, params);
      /**
       * The children of this Group.
       * @type {Array}
       * @private
       */

      _this.children = [];
      return _this;
    }
    /**
     * Sets the plot of this element, as well as any children, to the given plot
     * @param plot {Plot}
     */


    _createClass(Group, [{
      key: "_setPlot",
      value: function _setPlot(plot) {
        this.plot = plot;
        var children = this.children.children;

        for (var i = 0; i < children.length; ++i) {
          children[i]._setPlot(plot);
        }
      }
      /**
       * Add an element as a child of this element. Corresponding inverse operation is remove(child).
       * @param element {Array|Element} Array of elements, or single element to remove
       * @returns {Element} Returns itself (for chaining)
       */

    }, {
      key: "add",
      value: function add(element) {
        if (element instanceof Element) {
          if (element.parent || element.plot) {
            throw new Error("Element is already assigned a plot and/or is a child of an element");
          }

          element._setPlot(this.plot);

          element.parent = this;
          this.children.push(element);
        } else if (Array.isArray(element)) {
          for (var i = 0; i < element.length; ++i) {
            this.add(element[i]);
          }
        } else if (arguments.length > 1) {
          // Additional elements passed as arguments
          for (var _i = 0; _i < arguments.length; ++_i) {
            this.add(arguments[_i]);
          }
        } else {
          throw new TypeError("Given parameter is not an array of elements or an element");
        }

        return this;
      }
      /**
       * How many children this element has.
       * @returns {number}
       */

    }, {
      key: "childCount",
      value: function childCount() {
        return this.children.length;
      }
    }, {
      key: "destroy",
      value: function destroy() {
        _get(_getPrototypeOf(Group.prototype), "destroy", this).call(this); // Destroy children


        if (this.hasChildren()) {
          var children = this.children.slice();
          this.removeAll();

          for (var i = 0; i < children.length; ++i) {
            children[i].destroy();
          }
        }
      }
      /**
       * Whether this has any children.
       * @returns {boolean}
       */

    }, {
      key: "hasChildren",
      value: function hasChildren() {
        return this.children.length !== 0;
      }
      /**
       * Remove an immediate child from the element. Fails silently if the child is not a child of this element.
       * @param child {Array|Element|string} Array of elements, single element, or id of element to remove.
       * @returns {Element} Returns itself (for chaining)
       */

    }, {
      key: "remove",
      value: function remove(child) {
        var index = -1;

        if (child instanceof Element) {
          index = this.children.indexOf(child);
        } else if (typeof child === "string") {
          index = this.children.findIndex(function (c) {
            return c.id === child;
          });
        } else if (child instanceof Array) {
          // If the provided array is literally the children, call removeAll() instead
          if (child !== this.children) {
            for (var i = 0; i < child.length; ++i) {
              this.remove(child[i]);
            }
          }
        } else if (arguments.length > 1) {
          for (var _i2 = 0; _i2 < arguments.length; ++_i2) {
            this.remove(arguments[_i2]);
          }
        } else {
          throw new TypeError("Given parameter is not an array of elements or an element");
        }

        if (index !== -1) {
          // Remove from children
          this.children.splice(index, 1);

          child._setPlot(null);

          child.parent = null;
        }

        return this;
      }
      /**
       * Remove all the children from this element; faster than calling remove( ... ) individually.
       * @returns {Element} Returns itself (for chaining)
       */

    }, {
      key: "removeAll",
      value: function removeAll() {
        this.children.forEach(function (child) {
          child._setPlot(null);

          child.parent = null;
        });
        this.children = [];
        return this;
      }
    }]);

    return Group;
  }(Element);

  _defineProperty(Group, "abbrName", "group");

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
   * Thus, we use ES6 generators. Note that these can be transpiled, with some performance limitations, to ES5 generators
   * via Regenerator. A function like this is called a "bolus". Why? Because I like that word. Also, it makes it feel
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
  function coatBolus(bolus, stepIndex, stepCount) {}
  /**
   * Digest a bolus directly, which is ideal for
   * @param bolus {Function} The bolus to evaluate, which may be a normal function or a generator.
   * @param params {Object} Extra parameters
   * @param params.args {Array} Array of arguments (enzymes) to supply the bolus
   * @param params.timeout {number} How many milliseconds to permit the function evaluation before raising a BolusTimeoutError
   */


  function syncDigest(bolus) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$args = _ref.args,
        args = _ref$args === void 0 ? [] : _ref$args,
        _ref$timeout = _ref.timeout;

    var ingestedBolus = bolus.apply(void 0, _toConsumableArray(args));

    var _iterator = _createForOfIteratorHelper(ingestedBolus),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var progress = _step.value;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  exports.Element = Element;
  exports.Eventful = Eventful;
  exports.FP = fp_manip;
  exports.Group = Group;
  exports.RealFunctions = RealFunctions;
  exports.closestRational = closestRational;
  exports.coatBolus = coatBolus;
  exports.doubleToRational = doubleToRational;
  exports.syncDigest = syncDigest;
  exports.utils = utils;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
