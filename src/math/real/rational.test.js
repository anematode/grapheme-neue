import { closestRational, doubleToRational } from "./rational.js"
import {gcd} from "./basic_arithmetic"

test("Throws on out-of-bounds", () => {
  const dumbNumbers = [-Infinity, NaN, Infinity, -1, -1.5, 0.5, 2 ** 53, 2 ** 53 + 100, Number.MAX_VALUE ]
  const acceptableNumbers = [ 3, 100 ]

  for (const dumb of dumbNumbers) {
    for (const acceptable of acceptableNumbers) {
      expect(() => closestRational(0, dumb, acceptable)).toThrow()
      expect(() => closestRational(0, acceptable, dumb)).toThrow()
    }
  }
})

test("Handles special values", () => {
  expectAllEquals(closestRational, [
    [Infinity, 100000], [Infinity, 2], [-Infinity, 2], [NaN, 2]
  ], [NaN, NaN, NaN])
})

function rand() {
  return Math.ceil(Math.random() * 10000)
}

test("Random fractions", () => {
  const testCases = []

  for (let i = 0; i < 5000; ++i) {
    let a = rand(), b = rand()
    let g = gcd(a, b)
    a /= g
    b /= g

    testCases.push([a/b, 1e6, [a, b, 0]])
    testCases.push([-a/b, 1e6, [-a, b, 0]])
  }

  expectMultipleCases(closestRational, testCases)
})
