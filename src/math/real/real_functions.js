import { add, divide, multiply, subtract } from './basic_arithmetic.js'
import { gamma, lnGamma, factorial } from './gamma.js'
import { pow } from './pow.js'

/**
 * Functions that accept double-precision floating point numbers as arguments. Common functions not here are likely
 * provided by Math, so use those.
 * @namespace RealFunctions
 */
const RealFunctions = Object.freeze({
  add,
  divide,
  multiply,
  subtract,
  gamma,
  lnGamma,
  factorial,
  pow
})

export { RealFunctions }
