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
export function add (x, y) {
  return x + y
}

/**
 * Returns x - y.
 * @param x {number}
 * @param y {number}
 * @returns {number}
 * @function subtract
 * @memberOf RealFunctions
 */
export function subtract (x, y) {
  return x - y
}

/**
 * Returns x * y.
 * @param x {number}
 * @param y {number}
 * @returns {number}
 * @function multiply
 * @memberOf RealFunctions
 */
export function multiply (x, y) {
  return x * y
}

/**
 * Returns x / y.
 * @param x {number}
 * @param y {number}
 * @returns {number}
 * @function divide
 * @memberOf RealFunctions
 */
export function divide (x, y) {
  return x / y
}

/**
 * Returns the greatest common divisor of a and b. Uses the Euclidean algorithm.
 * @param a {number}
 * @param b {number}
 * @returns {number}
 * @function gcd
 * @memberOf RealFunctions
 */
export function gcd (a, b) {
  if (a === 0) { return b }
  if (b === 0) { return a }

  a = Math.abs(a)
  b = Math.abs(b)

  if (b > a) {
    const tmp = a
    a = b
    b = tmp
  }

  while (true) {
    if (b === 0) { return a }

    a %= b

    if (a === 0) { return b }

    b %= a
  }
}
