import { WASM } from "../wasm/wasm.js"

let version = 0

/**
 * This function returns a number starting from 1 that never decreases. It is used to store "when" an operation has
 * occurred, and thus whether to consider it a change.
 * @returns {number}
 */
export function getVersionID () {
  return ++version
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
    return String.fromCharCode(Math.round(Math.random() * 25 + 97))
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
  if (isTypedArray(x) && isTypedArray(y)) {
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

/**
 * Merge two objects, not checking for circularity, not merging arrays, modifying the first object
 * @param target {{}}
 * @param source {{}}
 * @param opts
 */
export function deepAssign (target, source, opts={}) {
  opts.cloneArrays = opts.cloneArrays ?? true
  opts.assignUndefined = opts.assignUndefined ?? false

  return deepAssignInternal(target, source, opts)
}

function deepAssignInternal (target, source, opts) {
  if (typeof source !== "object") return (source !== undefined || opts.assignUndefined) ? source : target

  if (Array.isArray(target) || isTypedArray(target))
    return opts.cloneArrays ? deepClone(source) : source

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      let sourceVal = source[key]

      if (opts.assignUndefined || sourceVal !== undefined) {
        let val = target[key]
        let sourceIsArray = Array.isArray(sourceVal) || isTypedArray(sourceVal)

        if (typeof val === "object" && !Array.isArray(val)) {
          if (typeof sourceVal === "object" && !sourceIsArray) {
            deepAssign(val, sourceVal, opts)
            continue
          }
        }

        target[key] = (sourceIsArray && opts.cloneArrays) ? deepClone(sourceVal) : sourceVal
      }
    }
  }

  return target
}

/**
 * Same as deepAssign, but creating a copy of the object. Arrays are optionally copied.
 * @param target {{}}
 * @param source {{}}
 * @param opts
 */
export function deepMerge (target, source, opts={}) {
  return deepAssign(deepClone(target, opts), source, opts)
}

/**
 * Deep clone an object, not checking for circularity or other weirdness, optionally cloning arrays
 * @param object
 * @param opts
 */
export function deepClone (object, opts={}) {
  opts.cloneArrays = opts.cloneArrays ?? true

  return deepCloneInternal(object, opts)
}

function deepCloneInternal (object, opts={}) {
  if (typeof object !== "object") return object

  if (Array.isArray(object)) {
    return opts.cloneArrays ? object.map(val => deepCloneInternal(val, opts)) : object
  } else if (isTypedArray(object)) {
    return opts.cloneArrays ? new object.constructor(object) : object
  }

  let ret = {}
  for (let key in object) {
    if (object.hasOwnProperty(key)) {
      ret[key] = deepClone(object[key], opts)
    }
  }

  return ret
}

export function isTypedArray (arr) {
  return (ArrayBuffer.isView(arr)) && !(arr instanceof DataView)
}

export function mod (n, m) {
  return ((n % m) + m) % m
}

export function nextPowerOfTwo (n) {
  return 1 << (Math.ceil(Math.log2(n)))
}

/**
 * Freeze an object and all its children. Does not account for cycles
 * @param obj
 */
export function deepFreeze (obj) {
  Object.freeze(obj)

  Object.values(obj).forEach(value => {
    if (typeof value === "function" || typeof value === "object")
      deepFreeze(value)
  })

  return obj
}

export function leftZeroPad (str, len, char='0') {
  if (str.length >= len) return str

  return char.repeat(len - str.length) + str
}

/**
 * Simple performance testing function
 * @param callback {Function}
 * @param iterations {number}
 * @param msg {string}
 */
export function performance (callback, iterations=100000, msg) {
  let timeStart = Date.now()

  for (let i = 0; i < iterations; ++i) {
    callback(i)
  }

  let timeEnd = Date.now()

  console.log(`Process ${msg} took an average of ${(timeEnd - timeStart) / iterations} ms per iteration (${iterations} iterations).`)
}

const onReadyCallbacks = []
export function onReady (callback) {
  onReadyCallbacks.push(callback)
}

WASM.onRuntimeInitialized = () => {
  for (const callback of onReadyCallbacks) callback()
}
