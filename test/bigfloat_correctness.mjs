// The aim of this file is to check for correctness in BigFloat implementations. There are a couple of ways to do this:
// to compare to implementations of base functions that we know to be correct, and to compare to built-in float manip
// ulation functions.
import {BigFloat, prettyPrintFloat, roundMantissaToPrecision} from "../src/math/bigint/bigfloat"
import {expect} from "chai"
import {ROUNDING_MODE, roundingModeToString} from "../src/math/rounding_modes"

const BF = BigFloat

// Passed: array of arguments, size of target mantissa, expected value of target mantissa, and expected returned shift
function testMantissaCase(func, args, argNames, targetSize, expectedTarget, expectedShift) {
  let target = new Int32Array(targetSize)

  // Fill array with junk data, in case the array isn't cleared correctly
  target.fill(0x2BADBEEF)

  // Allow normal arrays to be used, for brevity
  args = args.map(a => Array.isArray(a) ? new Int32Array(a) : a)

  let i = argNames.indexOf("target")
  args[i] =

  func(...args, target, )
}


describe('roundMantissaToPrecision', function () {
  const roundingModes = [0, 1, 2, 3, 4, 5]

  function testCase(mantissa, precision, roundingMode, expectedMantissa, expectedShift) {
    expectedMantissa = new Int32Array(expectedMantissa)
    let target = new Int32Array(expectedMantissa.length)

    let shift = roundMantissaToPrecision(mantissa, precision, target, roundingMode)

    // To cope with different length returns
    let result = new Int32Array(expectedMantissa.length)
    result.set(target.subarray(0, expectedMantissa.length))

    expect(result, `Expected result on mantissa ${prettyPrintFloat(mantissa)} with precision ${precision} and roundingMode ${roundingModeToString(roundingMode)}`).to.deep.equal(expectedMantissa)
    expect(shift, `Expected shift on mantissa ${prettyPrintFloat(mantissa)} with precision ${precision} and roundingMode ${roundingModeToString(roundingMode)}`).to.equal(expectedShift)
  }

  it('should return 0 for all 0 mantissas', function () {
    let zeros = new Int32Array(5)

    for (const mode of roundingModes) {
      for (let i = 1; i < 160; ++i) {
        testCase(zeros, i, mode, zeros, 0)
      }
    }
  })

  it('should carry, in NEAREST and UP', function () {
    let ones = new Int32Array([0x1FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF])
    let result = new Int32Array([0x20000000, 0, 0, 0, 0])

    for (const mode of [ROUNDING_MODE.NEAREST, ROUNDING_MODE.UP]) {
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

    for (const mode of [ROUNDING_MODE.NEAREST, ROUNDING_MODE.UP]) {
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

    testCase(ones, 17, ROUNDING_MODE.NEAREST, [0x1, 0x0], 1)

    ones = new Int32Array([0x3FFF1000])

    testCase(ones, 17, ROUNDING_MODE.NEAREST, [0x3FFF0000, 0x0], 0)
    testCase(ones, 17, ROUNDING_MODE.TIES_AWAY, [0x3FFF2000, 0x0], 0)
    testCase(ones, 18, ROUNDING_MODE.NEAREST, [0x3FFF1000, 0x0], 0)
    testCase(ones, 18, ROUNDING_MODE.TIES_AWAY, [0x3FFF1000, 0x0], 0)

    ones = new Int32Array([0x3FFF3000])

    testCase(ones, 17, ROUNDING_MODE.NEAREST, [0x3FFF4000, 0x0], 0)
    testCase(ones, 17, ROUNDING_MODE.TIES_AWAY, [0x3FFF4000, 0x0], 0)
    testCase(ones, 18, ROUNDING_MODE.NEAREST, [0x3FFF3000, 0x0], 0)
    testCase(ones, 18, ROUNDING_MODE.TIES_AWAY, [0x3FFF3000, 0x0], 0)
  })

  it('should work correctly when the rounding occurs on a word boundary', function () {
    let test = new Int32Array([0x1FFFFFFF, 0x20000000, 0x1])

    testCase(test, 29, ROUNDING_MODE.DOWN, [0x1FFFFFFF, 0x0, 0x0], 0)
    testCase(test, 29, ROUNDING_MODE.UP, [0x20000000, 0x0, 0x0], 0)
    testCase(test, 29, ROUNDING_MODE.NEAREST, [0x20000000, 0x0, 0x0], 0)
    testCase(test, 29, ROUNDING_MODE.TIES_AWAY, [0x20000000, 0x0, 0x0], 0)

    test = new Int32Array([0x1FFFFFFE, 0x20000000, 0x0])

    testCase(test, 29, ROUNDING_MODE.DOWN, [0x1FFFFFFE, 0x0, 0x0], 0)
    testCase(test, 29, ROUNDING_MODE.UP, [0x1FFFFFFF, 0x0, 0x0], 0)
    testCase(test, 29, ROUNDING_MODE.NEAREST, [0x1FFFFFFE, 0x0, 0x0], 0)
    testCase(test, 29, ROUNDING_MODE.TIES_AWAY, [0x1FFFFFFF, 0x0, 0x0], 0)

    test = new Int32Array([0x1FFFFFFE, 0x10000000, 0x0])

    testCase(test, 29, ROUNDING_MODE.DOWN, [0x1FFFFFFE, 0x0, 0x0], 0)
    testCase(test, 29, ROUNDING_MODE.UP, [0x1FFFFFFF, 0x0, 0x0], 0)
    testCase(test, 29, ROUNDING_MODE.NEAREST, [0x1FFFFFFE, 0x0, 0x0], 0)
    testCase(test, 29, ROUNDING_MODE.TIES_AWAY, [0x1FFFFFFE, 0x0, 0x0], 0)
  })
})
