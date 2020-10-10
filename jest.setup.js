/** Convenience testing functions */

globalThis.expectMultipleCases = (func, testCases) => {
  testCases.forEach(testCase => {
    const args = testCase.slice(0, testCase.length - 1)
    expect(func(...args), `Input was ${args.join(', ')}`).toEqual(testCase[testCase.length - 1])
  })
}

globalThis.expectAllEquals = (func, testCases, value) => {
  testCases.forEach(testCase => {
    expect(func(testCase), `Input was ${testCase}`).toEqual(value)
  })
}
