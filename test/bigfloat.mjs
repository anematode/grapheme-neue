import {BigFloat, roundMantissaToPrecision} from "../src/math/bigint/bigfloat.js"
import {deepEquals, leftZeroPad} from "../src/core/utils.js"
import {ROUNDING_MODE} from "../src/math/rounding_modes.js"

import {expect} from "chai"

const BF = BigFloat
const RM = ROUNDING_MODE

export function prettyPrintMantissa (mantissa, color="\x1b[32m") {
  return '[ ' + Array.from(mantissa).map(toHex).map(s => `${color}${s}\x1b[0m`).join(', ') + ' ]'
}

function prettyPrintArg (arg) {
  if (arg instanceof Int32Array) {
    return prettyPrintMantissa(arg)
  } else if (typeof arg === "number") {
    if (Object.is(arg, -0)) {
      return "-0"
    } else {
      return arg + ''
    }
  } else {
    return arg + ''
  }
}

/**
 * Pretty prints a word of a mantissa
 * @param a {number}
 * @returns {string}
 */
export function toHex (a) {
  return ((a < 0) ? '-' : '') + "0x" + leftZeroPad(Math.abs(a).toString(16), 8, '0')
}

/**
 * Verify whether a mantissa is valid; negative/overflow/zeros
 * @param mantissa
 */
export function verifyMantissa (mantissa) {
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

function wrapError(f) {
  return { toString: f }
}

// Passed: array of arguments, size of target mantissa, expected value of target mantissa, and expected returned shift
export function testMantissaCase (func, args, argNames, expectedTarget, expectedReturn) {
  verifyMantissa(expectedTarget)

  // Replace target argument with empty array of corresponding length
  let i = argNames.indexOf("target")

  let target = new Int32Array(args[i]) // give target size
  args[i] = target

  // So that they have the same length
  let typedExpectedTarget = new Int32Array(target.length)
  for (let i = 0; i < target.length; ++i) typedExpectedTarget[i] = expectedTarget[i]

  expectedTarget = typedExpectedTarget

  // Fill array with junk data, in case the array isn't cleared correctly
  target.fill(0x2BADBEEF)

  const originalTarget = new Int32Array(target)

  // Allow normal arrays to be used, for brevity
  args = args.map(a => Array.isArray(a) ? new Int32Array(a) : a)

  let ret = func(...args)

  function formatArgs () {
    let out = ""
    for (let _i = 0; _i < argNames.length; ++_i) {
      out += `\n\x1b[32m${argNames[_i]}\x1b[0m: ${prettyPrintArg((i === _i) ? originalTarget : args[_i])}`
    }
    return out
  }

  expect(target).to.deep.equal(expectedTarget,
    `Incorrect result while testing function ${func.name}. Arguments are as follows: ${formatArgs()}\nExpected target mantissa: ${prettyPrintArg(expectedTarget)}\nActual mantissa:          ${prettyPrintMantissa(target, '\u001b[31m')}\n`)

  expect(ret).to.equal(expectedReturn, `Incorrect result while testing function ${func.name}. Arguments are as follows: ${formatArgs()}\nExpected return: ${prettyPrintArg(expectedReturn)}\nActual return: ${prettyPrintArg(ret)} `)
}

describe("roundMantissaToPrecision", () => {
  const argNames = ["mant", "prec", "target", "round", "trailing", "trailingInfo"]

  testMantissaCase(roundMantissaToPrecision, [ [ 0x1fffffff, 0 ], 20, 2, RM.NEAREST, 0, 0 ], argNames, [ 0x20000000, 0 ], 0)
})
