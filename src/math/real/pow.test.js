import { pow } from "./pow"
import {roundUp} from "./fp_manip"
import {roundDown} from "./fp_manip"

function combinations(cows, l) {
  if (l === 0)
    return []

  const rec = combinations(cows, l - 1)
  const ret = []

  for (const perm of rec) {
    for (const cow of cows) {
      ret.push([...rec, cow])
    }
  }

  return ret
}

test('behaves like Math.pow for most arguments', () => {
  let cases = [
    [1, 2],
    [1, -2.4],
    [1.5, 12.1241],
    [1, .51241],
    [0.1409128, 120.124],
    [0, 0.1241],
    [150.12498, 12.14928],
    [10, 2],
    [-2, 3],
    [-152001.3, 2],
    [-142919, 40],
    [-20104.42, -22],
    [-219, 22],
    [-49.001, 22],
    [-1.0009, 391],
    [-40, -30],
    [120, 0],
    [-100, 0],
    [4102, 0],
    [-210.5, 0],
    ...combinations([Infinity, -Infinity, 0, -0], 2)
  ]

  cases = cases.map((...args) => [...args, Math.pow(...args)])

  expectMultipleCases(pow, cases)
})

test('returns NaN if any argument is NaN', () => {
  const cases = [
    [NaN, NaN, NaN],
    [NaN, 0, NaN],
    [0, NaN, NaN]
  ]

  expectMultipleCases(pow, cases)
})

const bases = [
  -2,
  -1.121,
  -1,
  -141004001001.4,
  -24194.140198
]

test('returns NaN for negative base with exponent with even denominator', () => {
  const angers = [
    151 / 2,
    15 / 2,
    429 / 2,
    511 / 12,
    1581 / 144,
    50181 / 502
  ]

  angers.push(...angers.map(anger => -anger))
  angers.push(...angers.map(anger => [roundUp(anger), roundDown(anger)]).flat())

  for (const base of bases) {
    for (const anger of angers) {
      expect(pow(base, anger), `Input was ${base} ^ ${anger}`).toBe(NaN)
    }
  }
})

const getSurrounding = cow => [roundUp(cow), cow, roundDown(cow)]

test('Happy values for negative base and fractions', () => {
  const happyNegatives = [
    1 / 3,
    1 / 5,
    1 / 51051,
    503 / 505,
    507 / 505,
    5071 / 5069,
    500001 / 501
  ]

  const happyPositives = [
    3102 / 3101,
    41028 / 3,
    4192 / 151,
    42 / 3,
    140218 / 141,
    1401840 / 21041
  ]

  for (const neg of happyNegatives) {
    for (const base of bases) {
      for (const cow of getSurrounding(neg)) {
        expect(pow(base, cow), `Input was ${base} ^ ${cow}`).toBe(-Math.pow(-base, neg))
      }
    }
  }

  for (const pos of happyPositives) {
    for (const base of bases) {
      for (const cow of getSurrounding(pos)) {
        expect(pow(base, cow), `Input was ${base} ^ ${cow}`).toBe(Math.pow(-base, pos))
      }
    }
  }
})

test('pi and e considered irrational', () => {
  expectMultipleCases(pow, [
    [-2, Math.PI, NaN],
    [-2, -Math.PI, NaN],
    [-2, Math.E, NaN],
    [-2, -Math.E, NaN]
  ])
})

test('Various other fractions correct', () => {
  const rand = () => Math.floor((Math.random() - 0.5) * 1000)

  const fractions = [...Array(100).keys()].map(a => rand() / rand())
  const alsohappy = [...fractions.map(roundUp), ...fractions.map(roundDown)]
  const angers = [ ...fractions.map(roundUp).map(roundUp), ...fractions.map(roundDown).map(roundDown) ]

  for (const frac of [ ...fractions, ...alsohappy ]) {
    for (const base of bases) {
      expect(pow(base, frac), `Input was ${base} ^ ${frac}`).toBeDefined()
    }
  }

  for (const frac of angers) {
    for (const base of bases) {
      expect(pow(base, frac), `Input was ${base} ^ ${frac}`).toBeNaN()
    }
  }
})
