/** Convenience testing functions */

globalThis.expectMultipleCases = (func, testCases) => {
  testCases.forEach(testCase => {
    const args = testCase.slice(0, testCase.length)
    expect(func(...args), `Input was ${args.join(', ')}`).toBe(testCase[testCase.length - 1])
  })
}

globalThis.expectAllEquals = (func, testCases, value) => {
  testCases.forEach(testCase => {
    expect(func(testCase), `Input was ${testCase}`).toBe(value)
  })
}
