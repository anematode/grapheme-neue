/** The scariest functions. */

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

export function gcd (a, b) {
  a = Math.abs(a)
  b = Math.abs(b)

  if (b > a) {
    let tmp = a
    a = b
    b = tmp
  }

  while (true) {
    if (b === 0)
      return a

    a %= b

    if (a === 0)
      return b

    b %= a
  }
}
