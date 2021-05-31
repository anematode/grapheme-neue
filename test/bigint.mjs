import { assert, expect } from "chai"
import { mulWords, BigInt as GraphemeBigInt } from "../src/math/bigint/bigint.js"

const troublesomeWords = []

for (let i = 0; i < 30; ++i) {
  troublesomeWords.push(1 << i, (1 << i) - 1)
}

troublesomeWords.push((1 << 30) - 1)

for (const word in troublesomeWords.slice()) {
  if (word > 1 << 15) troublesomeWords.push(word - (1 << 15))
}

troublesomeWords.push(673814485, 427759235) // product of these two is 1 less than a multiple of 2^30, which should mess up the float implementation

const randomWords = [
  // Random between 0 and max word
  413625422,826942438,761407286,495022633,745715949,783650653,908596623,525377245,489586829,601970053,565791509,669992135,22856529,222902553,993108911,881956155,166094851,63726456,33878976,964879830,766630476,167593609,211278258,961318617,229296931,542945071,320405141,231477421,59684013,594699550,807305345,692194936,606245353,632591721,316880104,116596988,103634937,758450601,584090650,254357607,177703089,946559508,980088176,414001586,866928963,712067196,559848602,344592514,48105628,783737071,
  // Random between 0 and max word part
  16916,1461,26578,18697,5426,22736,15001,19505,31156,8046,20726,4063,9147,8252,2376,4604,17487,9392,5199,12790,17227,6855,24996,14895,6387,12670,21015,16015,7271,25279,24195,28386,22567,1328,4134,12399,25506,30951,16183,4571,6511,25456,1785,27168,31226,19314,3401,12247,29951,13459
]

const allTestWords = [ ...troublesomeWords, ...randomWords ]
const randomBigInts = [ 0n, -100n, -329n, 1000000000n, 999999999n, 1000000000000000000n, BigInt(1e100), 14091824019820481203819281n, 10000040204182018n, 92103901710491203981059817023981705981720398750981703928123n, BigInt(2 ** 1022) ]

let words = [...new Array(1000).keys()].map(() => Math.random()*(2**30) | 0)
let giantInt = new GraphemeBigInt().initFromWords(words)
let radixes = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]

describe('mulWords', function() {
  it('should return the same results as the corresponding native bigint calculation', function() {
    function testWordCombination (word1, word2) {
      let res = mulWords(word1, word2)
      let trueResult = BigInt(word1) * BigInt(word2)

      trueResult = [ Number(trueResult & 0x3FFFFFFFn), Number(trueResult >> 30n) ]

      expect(res, `Result on ${word1} and ${word2} should be ${trueResult}`).to.deep.equal(trueResult)
    }

    for (const word1 of allTestWords) {
      for (const word2 of allTestWords) {
        testWordCombination(word1, word2)
      }
    }
  })
})

describe('BigInt', function() {
  it('should throw on non-finite numeric values', function () {
    expect(() => new GraphemeBigInt(NaN)).to.throw();
    expect(() => new GraphemeBigInt(Infinity)).to.throw();
    expect(() => new GraphemeBigInt(-Infinity)).to.throw();
  })

  it('should return correct values for toString', function () {
    for (const radix of radixes) {
      for (const bigint of randomBigInts) {
        expect(new GraphemeBigInt(bigint).toString(radix), `Result on bigint ${bigint} for radix ${radix}`).to.equal(bigint.toString(radix))
      }
    }
  })

  it('should return correct values for addInPlace', function () {
    const tests = [ [0, 1], [100, 101], [501,30]]
  })

  it('should be created correctly from strings', function () {
    for (const radix of radixes) {
      for (const bigint of randomBigInts) {
        expect(new GraphemeBigInt(bigint.toString(radix), radix).toString(), `Result on bigint ${bigint} for radix ${radix}`).to.equal(bigint.toString())
      }
    }
  })

  it('should compare equality with itself correctly', function () {
    for (const bigint of randomBigInts) {
      for (const bigint2 of randomBigInts) {
        expect(new GraphemeBigInt(bigint).equals(new GraphemeBigInt(bigint2))).to.equal(bigint === bigint2)
      }
    }
  })

  it('should obey inequalities', function () {
    for (const bigint of randomBigInts) {
      for (const bigint2 of randomBigInts) {
        expect(new GraphemeBigInt(bigint).lessThan(new GraphemeBigInt(bigint2))).to.equal(bigint < bigint2)
        expect(new GraphemeBigInt(bigint).lessThanOrEqual(new GraphemeBigInt(bigint2))).to.equal(bigint <= bigint2)
        expect(new GraphemeBigInt(bigint).greaterThan(new GraphemeBigInt(bigint2))).to.equal(bigint > bigint2)
        expect(new GraphemeBigInt(bigint).greaterThanOrEqual(new GraphemeBigInt(bigint2))).to.equal(bigint >= bigint2)
      }
    }
  })

  it('should multiply correctly', function () {
    for (const bigint of randomBigInts) {
      for (const bigint2 of randomBigInts) {
        expect(new GraphemeBigInt(bigint).multiply(new GraphemeBigInt(bigint2)).toString()).to.equal((bigint * bigint2).toString())
      }
    }
  })
})
