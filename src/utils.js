
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
