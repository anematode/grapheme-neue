
let id = 0

/** Returns a single unique positive integer */
export function getID () {
  return ++id
}

export function benchmark (callback, iterations = 100, output = console.log) {
  const start = performance.now()

  for (let i = 0; i < iterations; ++i) {
    callback()
  }

  const duration = performance.now() - start

  output(`Function ${callback.name} took ${duration / iterations} ms` + ((iterations === 1) ? '.' : ' per call.'))
}

export function time (callback, output = console.log) {
  const start = performance.now()
  let result = 'finished'

  try {
    callback()
  } catch (e) {
    result = 'threw'
    throw e
  } finally {
    output(`Function ${callback.name} ${result} in ${performance.now() - start} ms.`)
  }
}

export function assertRange (num, min, max, variableName = 'Unknown variable') {
  if (num < min || num > max || Number.isNaN(num)) {
    throw new RangeError(`${variableName} must be in the range [${min}, ${max}]`)
  }
}

export function isPrimitive (obj) {
  return typeof obj === 'object' && obj !== null
}

// Generate an id of the form xxxx-xxxx
// TODO: guarantee no collisions via LFSR or something similar
export function getStringID () {
  function randLetter() {
    return String.fromCharCode(Math.round(Math.random() * 25 + 96))
  }

  function randFourLetter() {
    return randLetter() + randLetter() + randLetter() + randLetter()
  }

  return randFourLetter() + '-' + randFourLetter()
}

// Simple deep equals. Uses Object.is-type equality, though. Doesn't handle circularity or any of the fancy new containers
export function deepEquals (x, y) {
  if (typeof x !== "object" || x === null) return Object.is(x, y)
  if (x.constructor !== y.constructor) return false

  if (Array.isArray(x) && Array.isArray(y)) {
    if (x.length !== y.length) return false
    for (let i = x.length - 1; i >= 0; --i) {
      if (!deepEquals(x[i], y[i])) return false
    }

    return true
  }

  // The only other thing of consequence to us. Could probably handle other weird objects too, but meh.
  if (ArrayBuffer.isView(x) && ArrayBuffer.isView(y)) {
    if (x.length !== y.length) return false

    if (x instanceof Float32Array || x instanceof Float64Array) {
      for (let i = x.length - 1; i >= 0; --i) {
        const xv = x[i]

        // What a beautiful way to test for same valueness between floats!
        if ((xv !== y[i] && !(xv !== xv && y[i] !== y[i])) || (xv === 0 && 1 / xv !== 1 / y[i])) return false
      }
    } else {
      for (let i = x.length - 1; i >= 0; --i) {
        if (x[i] !== y[i]) return false
      }
    }

    return true
  }

  if (x instanceof Map || x instanceof Set) return false // Just in case

  // x and y are just objects
  const keys = Object.keys(x)
  if (Object.keys(y).length !== keys.length) return false

  for (const key of keys) {
    // fails if y is Object.create(null)
    if (!y.hasOwnProperty(key)) return false
    if (!deepEquals(x[key], y[key]))
      return false
  }

  return true
}

export function isTypedArray (arr) {
  return (ArrayBuffer.isView(arr)) && !(arr instanceof DataView)
}

export function mod (n, m) {
  return ((n % m) + m) % m
}
