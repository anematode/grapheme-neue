
let id = 0

/** Returns a single unique positive integer */
export function getID () {
  return ++id
}

export function benchmark (callback, iterations = 100, output = console.log) {
  let start = performance.now()

  for (let i = 0; i < iterations; ++i) {
    callback(i)
  }

  let duration = performance.now() - start

  output(`Function ${callback.name} took ${duration / iterations} ms per call.`)
}
