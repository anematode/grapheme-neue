
let id = 0

/** Returns a single unique positive integer */
export function getID () {
  return ++id
}

export function benchmark (callback, iterations = 100, output = console.log) {
  const start = performance.now()

  for (let i = 0; i < iterations; ++i) {
    callback(i)
  }

  const duration = performance.now() - start

  output(`Function ${callback.name} took ${duration / iterations} ms per call.`)
}

export function assertRange (num, min, max, variableName = 'Unknown variable') {
  if (num < min || num > max || Number.isNaN(num)) {
    throw new RangeError(`${variableName} must be in the range [${min}, ${max}]`)
  }
}
