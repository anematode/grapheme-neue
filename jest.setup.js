/** Convenience testing functions */

globalThis.expectMultipleCases = (func, testCases) => {
  testCases.forEach(testCase => {
    expect(func(testCase[0]), `Input was ${testCase[0]}`).toBe(testCase[1])
  })
}

globalThis.expectAllEquals = (func, testCases, value) => {
  testCases.forEach(testCase => {
    expect(func(testCase), `Input was ${testCase}`).toBe(value)
  })
}
