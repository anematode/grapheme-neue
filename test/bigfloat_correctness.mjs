// The aim of this file is to check for correctness in BigFloat implementations. There are a couple of ways to do this:
// to compare to implementations of base functions that we know to be correct, and to compare to built-in float manip
// ulation functions.
import {BigFloat, prettyPrintFloat, roundMantissaToPrecision} from "../src/math/bigint/bigfloat.js"
import {expect} from "chai"
import {ROUNDING_MODE, roundingModeToString} from "../src/math/rounding_modes.js"
import {leftZeroPad} from "../src/core/utils.js"
import {neededWordsForPrecision} from "../src/math/bigint/bigfloat"

const BF = BigFloat

function prettyPrintMantissa (mantissa) {
  return '[' + Array.from(mantissa).map(toHex).join(', ') + ']'
}

/**
 *
 * @param a {number}
 * @returns {string}
 */
function toHex (a) {
  return ((a < 0) ? '-' : '') + "0x" + leftZeroPad(Math.abs(a).toString(16), 8, '0')
}

/**
 * Verify whether a mantissa is valid; negative/overflow/zeros
 * @param mantissa
 */
function verifyMantissa (mantissa) {
  if (mantissa[0] === 0)
    throw new Error("Mantissa should not have a 0 as its first word")

  for (let i = 0; i < mantissa.length; ++i) {
    let m = mantissa[i]
    if (m < 0)
      throw new Error(`Mantissa has a negative word ${toHex(m)} at index ${i}`)
    else if (m > 0x3fffffff)
      throw new Error(`Mantissa has an overflowed word ${toHex(m)} at index ${i}`)
  }
}

// Passed: array of arguments, size of target mantissa, expected value of target mantissa, and expected returned shift
function testMantissaCase(func, args, argNames, expectedTarget, expectedReturn) {
  verifyMantissa(expectedTarget)

  // Replace target argument with empty array of corresponding length
  let i = argNames.indexOf("target")

  let target = new Int32Array(args[i]) // give target size
  args[i] = target

  // So that they have the same length
  let typedExpectedTarget = new Int32Array(target.length)
  for (let i = 0; i < target.length; ++i) typedExpectedTarget = expectedTarget[i]

  // Fill array with junk data, in case the array isn't cleared correctly
  target.fill(0x2BADBEEF)

  // Allow normal arrays to be used, for brevity
  args = args.map(a => Array.isArray(a) ? new Int32Array(a) : a)

  let ret = func(...args)

  expect(target).to.equal(expectedTarget)
  expect(ret).to.equal(expectedReturn)
}

const roundingModes = Object.values(ROUNDING_MODE)

describe('roundMantissaToPrecision', function () {
  function test ({ mant, prec, targetSize, round, trailing, trailingInfo } = {}, expectedTarget, expectedReturn) {
    prec = prec ?? 53
    targetSize = targetSize ?? neededWordsForPrecision(prec)
    round = round ?? ROUNDING_MODE.NEAREST
    trailing = trailing ?? 0
    trailingInfo = trailingInfo ?? 0

    testMantissaCase(roundMantissaToPrecision, args,
      [ "mant", "prec", "target", "round", "trailing", "trailingMode" ], expectedTarget, expectedReturn)
  }

  test([ [ 0x1fffffff ], 20, 2, ROUNDING_MODE.DOWN, 0, 0 ], [ 0x1fffffff, 0 ], 0)

  it('should return 0 for all 0 mantissas', function () {
    let zeros = new Int32Array(5)

    for (const mode of roundingModes) {
      for (let i = 1; i < 160; ++i) {
        test([ [zeros, i, mode, zeros, 0)
      }
    }
  })

  it('should carry, in NEAREST and UP', function () {
    let ones = new Int32Array([0x1FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF])
    let result = new Int32Array([0x20000000, 0, 0, 0, 0])

    for (const mode of [ ROUNDING_MODE.NEAREST, ROUNDING_MODE.UP ]) {
      for (let i = 1; i < 160; ++i) {
        if (i < 149) {
          testCase(ones, i, mode, result, 0)
        } else {
          testCase(ones, i, mode, ones, 0)
        }
      }
    }
  })

  it('should return a shift, in NEAREST and UP, for all mantissas consisting of only ones', function () {
    let ones = new Int32Array([0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF])
    let result = new Int32Array([1, 0, 0, 0, 0])

    for (const mode of [ ROUNDING_MODE.NEAREST, ROUNDING_MODE.UP ]) {
      for (let i = 1; i < 160; ++i) {
        if (i <= 149) {
          testCase(ones, i, mode, result, 1)
        } else {
          testCase(ones, i, mode, ones, 0)
        }
      }
    }
  })

  it('should tie correctly', function () {
    let ones = new Int32Array([0x3FFFF000])

    testCase(ones, 17, ROUNDING_MODE.NEAREST, [ 0x1, 0x0 ], 1)
    testCase(ones, 18, ROUNDING_MODE.NEAREST, [ 0x3FFFF000, 0x0 ], 0)

    ones = new Int32Array([0x3FFF1000])

    testCase(ones, 17, ROUNDING_MODE.NEAREST, [ 0x3FFF0000, 0x0 ], 0)
    testCase(ones, 17, ROUNDING_MODE.TIES_AWAY, [ 0x3FFF2000, 0x0 ], 0)
    testCase(ones, 18, ROUNDING_MODE.NEAREST, [ 0x3FFF1000, 0x0 ], 0)
    testCase(ones, 18, ROUNDING_MODE.TIES_AWAY, [ 0x3FFF1000, 0x0 ], 0)

    ones = new Int32Array([0x3FFF3000])

    testCase(ones, 17, ROUNDING_MODE.NEAREST, [ 0x3FFF4000, 0x0 ], 0)
    testCase(ones, 17, ROUNDING_MODE.TIES_AWAY, [ 0x3FFF4000, 0x0 ], 0)
    testCase(ones, 18, ROUNDING_MODE.NEAREST, [ 0x3FFF3000, 0x0 ], 0)
    testCase(ones, 18, ROUNDING_MODE.TIES_AWAY, [ 0x3FFF3000, 0x0 ], 0)
  })

  it('should work correctly when the rounding occurs on a word boundary', function () {
    let test = new Int32Array([0x1FFFFFFF, 0x20000000, 0x1])

    testCase(test, 29, ROUNDING_MODE.DOWN, [ 0x1FFFFFFF, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.UP, [ 0x20000000, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.NEAREST, [ 0x20000000, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.TIES_AWAY, [ 0x20000000, 0x0, 0x0 ], 0)

    test = new Int32Array([0x1FFFFFFE, 0x20000000, 0x0])

    testCase(test, 29, ROUNDING_MODE.DOWN, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.UP, [ 0x1FFFFFFF, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.NEAREST, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.TIES_AWAY, [ 0x1FFFFFFF, 0x0, 0x0 ], 0)

    test = new Int32Array([0x1FFFFFFE, 0x10000000, 0x0])

    testCase(test, 29, ROUNDING_MODE.DOWN, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.UP, [ 0x1FFFFFFF, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.NEAREST, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.TIES_AWAY, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
  })
})
