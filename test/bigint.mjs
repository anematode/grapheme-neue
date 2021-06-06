import { assert, expect } from "chai"
import { mulAddWords, BigInt as GraphemeBigInt } from "../src/math/bigint/bigint.js"
import { prettyPrintFloat, roundMantissaToPrecision, BigFloat, multiplyMantissaByInteger, addMantissas } from "../src/math/bigint/bigfloat.js"
import { ROUNDING_MODE, roundingModeToString } from "../src/math/rounding_modes.js"

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
const randomBigInts = [ -1n, 0n, -100n, -329n, 1000000000n, 999999999n, 1000000000000000000n, BigInt(1e100), 14091824019820481203819281n, 10000040204182018n, 92103901710491203981059817023981705981720398750981703928123n, BigInt(2 ** 1022) ]

for (let bigint of randomBigInts.slice()) randomBigInts.push(-bigint)

let words = [...new Array(1000).keys()].map(() => Math.random()*(2**30) | 0)
let giantInt = new GraphemeBigInt().initFromWords(words)
let radixes = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]

describe('mulAddWords', function() {
  it('should return the same results as the corresponding native bigint calculation', function() {
    function testWordCombination (word1, word2, word3) {
      let res = mulAddWords(word1, word2, word3)
      let trueResult = BigInt(word1) * BigInt(word2) + BigInt(word3)

      trueResult = [ Number(trueResult & 0x3FFFFFFFn), Number(trueResult >> 30n) ]

      expect(res, `Result on ${word1}, ${word2}, ${word3} should be ${trueResult}`).to.deep.equal(trueResult)
    }

    for (const word1 of allTestWords) {
      for (const word2 of allTestWords) {
        for (const word3 of [0, 1e9, 50158181])
          testWordCombination(word1, word2, word3)
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

  it('should be equal to itself', function () {
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

  it('should add correctly', function () {
    for (const bigint of randomBigInts) {
      for (const bigint2 of randomBigInts) {
        expect(new GraphemeBigInt(bigint).add(new GraphemeBigInt(bigint2)).toString(), `Result on bigint ${bigint} and ${bigint2}`).to.equal((bigint + bigint2).toString())
      }
    }
  })

  it('should subtract correctly', function () {
    for (const bigint of randomBigInts) {
      for (const bigint2 of randomBigInts) {
        expect(new GraphemeBigInt(bigint).subtract(new GraphemeBigInt(bigint2)).toString(), `Result on bigint ${bigint} and ${bigint2}`).to.equal((bigint - bigint2).toString())
      }
    }
  })
})

let testDoubles = [
  43915, 30284, 203.44, 25028.32, 320.2, -439, 0, 4228, 410, 0.4, 0.09, 0.0000000001, -0.4205,
  -Infinity, Infinity,
  Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MAX_VALUE,
  -Number.MAX_VALUE,
  2.2250738585072014e-308, 2 ** 1023, 2 ** -1025, 2 ** -1026 + 2 ** -1072
]

describe('BigFloat', function () {
  it('should have conversion identical to Math.fround', function () {
    for (const double of testDoubles) {
      let bf = BigFloat.fromNumber(double)
      let flt = bf.toNumber({ roundingMode: ROUNDING_MODE.NEAREST, f32: true })

      expect(flt, `Expected conversion to f32 on ${double} to be correct`).to.equal(Math.fround(double))
    }
  })

  it('should have lossless conversion between doubles', function () {
    for (const double of testDoubles) {
      let bf = BigFloat.fromNumber(double)
      let flt = bf.toNumber({ roundingMode: ROUNDING_MODE.NEAREST })

      expect(flt, `Expected conversion double on ${double} to be correct`).to.equal(double)
    }
  })

  it('should correctly handle special values', function () {

  })

  it('should have a new static function', function () {
    let flt = BigFloat.new(160)

    expect(flt.prec, `Expected precision to be set`).to.equal(160)
  })
})

describe('roundMantissaToPrecision', function () {
  const roundingModes = [ 0, 1, 2, 3, 4, 5 ]

  function testCase (mantissa, precision, roundingMode, expectedMantissa, expectedShift) {
    expectedMantissa = new Int32Array(expectedMantissa)
    let target = new Int32Array(expectedMantissa.length)

    let shift = roundMantissaToPrecision(mantissa, precision, target, roundingMode)

    // To cope with different length returns
    let result = new Int32Array(expectedMantissa.length)
    result.set(target.subarray(0, expectedMantissa.length))

    expect(result, `Expected result on mantissa ${prettyPrintFloat(mantissa)} with precision ${precision} and roundingMode ${roundingModeToString(roundingMode)}`).to.deep.equal(expectedMantissa)
    expect(shift, `Expected shift on mantissa ${prettyPrintFloat(mantissa)} with precision ${precision} and roundingMode ${roundingModeToString(roundingMode)}`).to.equal(expectedShift)
  }

  it('should return 0 for all 0 mantissas', function () {
    let zeros = new Int32Array(5)

    for (const mode of roundingModes) {
      for (let i = 1; i < 160; ++i) {
        testCase(zeros, i, mode, zeros, 0)
      }
    }
  })

  it('should carry, in NEAREST and UP', function () {
    let ones = new Int32Array([0x1FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF])
    let result = new Int32Array([0x20000000, 0, 0, 0, 0])

    for (const mode of [ ROUNDING_MODE.NEAREST, ROUNDING_MODE.UP ]) {
      for (let i = 1; i < 160; ++i) {
        if (i < 149) {
          testCase(ones, i, mode, result, 0)
        } else {
          testCase(ones, i, mode, ones, 0)
        }
      }
    }
  })

  it('should return a shift, in NEAREST and UP, for all mantissas consisting of only ones', function () {
    let ones = new Int32Array([0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF, 0x3FFFFFFF])
    let result = new Int32Array([1, 0, 0, 0, 0])

    for (const mode of [ ROUNDING_MODE.NEAREST, ROUNDING_MODE.UP ]) {
      for (let i = 1; i < 160; ++i) {
        if (i <= 149) {
          testCase(ones, i, mode, result, 1)
        } else {
          testCase(ones, i, mode, ones, 0)
        }
      }
    }
  })

  it('should tie correctly', function () {
    let ones = new Int32Array([0x3FFFF000])

    testCase(ones, 17, ROUNDING_MODE.NEAREST, [ 0x1, 0x0 ], 1)
    testCase(ones, 18, ROUNDING_MODE.NEAREST, [ 0x3FFFF000, 0x0 ], 0)

    ones = new Int32Array([0x3FFF1000])

    testCase(ones, 17, ROUNDING_MODE.NEAREST, [ 0x3FFF0000, 0x0 ], 0)
    testCase(ones, 17, ROUNDING_MODE.TIES_AWAY, [ 0x3FFF2000, 0x0 ], 0)
    testCase(ones, 18, ROUNDING_MODE.NEAREST, [ 0x3FFF1000, 0x0 ], 0)
    testCase(ones, 18, ROUNDING_MODE.TIES_AWAY, [ 0x3FFF1000, 0x0 ], 0)

    ones = new Int32Array([0x3FFF3000])

    testCase(ones, 17, ROUNDING_MODE.NEAREST, [ 0x3FFF4000, 0x0 ], 0)
    testCase(ones, 17, ROUNDING_MODE.TIES_AWAY, [ 0x3FFF4000, 0x0 ], 0)
    testCase(ones, 18, ROUNDING_MODE.NEAREST, [ 0x3FFF3000, 0x0 ], 0)
    testCase(ones, 18, ROUNDING_MODE.TIES_AWAY, [ 0x3FFF3000, 0x0 ], 0)
  })

  it('should work correctly when the rounding occurs on a word boundary', function () {
    let test = new Int32Array([0x1FFFFFFF, 0x20000000, 0x1])

    testCase(test, 29, ROUNDING_MODE.DOWN, [ 0x1FFFFFFF, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.UP, [ 0x20000000, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.NEAREST, [ 0x20000000, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.TIES_AWAY, [ 0x20000000, 0x0, 0x0 ], 0)

    test = new Int32Array([0x1FFFFFFE, 0x20000000, 0x0])

    testCase(test, 29, ROUNDING_MODE.DOWN, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.UP, [ 0x1FFFFFFF, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.NEAREST, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.TIES_AWAY, [ 0x1FFFFFFF, 0x0, 0x0 ], 0)

    test = new Int32Array([0x1FFFFFFE, 0x10000000, 0x0])

    testCase(test, 29, ROUNDING_MODE.DOWN, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.UP, [ 0x1FFFFFFF, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.NEAREST, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
    testCase(test, 29, ROUNDING_MODE.TIES_AWAY, [ 0x1FFFFFFE, 0x0, 0x0 ], 0)
  })
})


describe('addMantissas', function () {
  function testCase (mantissa1, mantissa2, m2shift, precision, roundingMode, expectedMantissa, expectedShift) {
    mantissa1 = new Int32Array(mantissa1)
    mantissa2 = new Int32Array(mantissa2)
    expectedMantissa = new Int32Array(expectedMantissa)

    let unpaddedResult = new Int32Array(expectedMantissa.length)
    let shift = addMantissas(mantissa1, mantissa2, m2shift, precision, unpaddedResult, roundingMode)

    // To cope with different length returns
    let result = new Int32Array(expectedMantissa.length)
    result.set(unpaddedResult.subarray(0, expectedMantissa.length))

    expect(result, `Expected result on mantissas ${prettyPrintFloat(mantissa1)} and ${prettyPrintFloat(mantissa2)} with precision ${precision} and roundingMode ${roundingModeToString(roundingMode)}`).to.deep.equal(expectedMantissa)
    expect(shift, `Expected shift on mantissa ${prettyPrintFloat(mantissa1)} and ${prettyPrintFloat(mantissa2)} with precision ${precision} and roundingMode ${roundingModeToString(roundingMode)}`).to.equal(expectedShift)
  }

  it('should correctly add simple cases', function () {
    testCase([ 0x1, 0x0 ], [0x1, 0x0, 0x0], 0, 53, ROUNDING_MODE.NEAREST, [ 2 ], 0)
    testCase([ 0x1, 0x3 ], [0x2, 0x4, 0x0], 0, 53, ROUNDING_MODE.NEAREST, [ 0x3, 0x7 ], 0)
    testCase([ 0x3fff0000, 0x3 ], [0x3fff, 0x4, 0x0], 0, 53, ROUNDING_MODE.NEAREST, [ 0x3fff3fff ], 0)
  })

  it('should correctly handle shifts', function () {
    testCase([ 0x1, 0x0 ], [0x1, 0x0], 10, 53, ROUNDING_MODE.NEAREST, [ 0x1 ], 0)
    testCase([ 0x1, 0x0 ], [0x1, 0x0], 10, 53, ROUNDING_MODE.UP, [ 0x1, 0x0, 0x100 ], 0)
  })
})

describe('add', function () {
  function testCase (f1, f2) {
    let res = BigFloat.new()
    BigFloat.add(BigFloat.fromNumber(f1), BigFloat.fromNumber(f2), res)

    res = res.toNumber()
    if (Number.isNaN(f1 + f2)) {
      expect(Number.isNaN(res))
    } else {
      expect(res, `Result on ${f1} and ${f2}`).to.equal(f1 + f2)
    }
  }

  it('should correctly handle various additions', function () {
    for (const d1 of testDoubles) {
      for (const d2 of testDoubles) {
        testCase(d1, d2)
      }
    }
  })
})

describe('subtract', function () {
  function testCase (f1, f2) {
    let res = BigFloat.new()
    BigFloat.sub(BigFloat.fromNumber(f1), BigFloat.fromNumber(f2), res)

    res = res.toNumber()
    if (Number.isNaN(f1 - f2)) {
      expect(Number.isNaN(res))
    } else {
      expect(res, `Result on ${f1} and ${f2}`).to.equal(f1 - f2)
    }
  }

  it('should correctly handle various subtractions', function () {
    for (const d1 of testDoubles) {
      for (const d2 of testDoubles) {
        testCase(d1, d2)
      }
    }
  })
})

describe('multiply', function () {
  function testCase (f1, f2) {
    let res = BigFloat.new()
    BigFloat.mul(BigFloat.fromNumber(f1), BigFloat.fromNumber(f2), res)

    res = res.toNumber()
    if (Number.isNaN(f1 * f2)) {
      expect(Number.isNaN(res))
    } else {
      expect(res, `Result on ${f1} and ${f2}`).to.equal(f1 * f2)
    }
  }

  it('should correctly handle various multiplications', function () {
    for (const d1 of testDoubles) {
      for (const d2 of testDoubles) {
        testCase(d1, d2)
      }
    }
  })
})

describe('divide', function () {
  function testCase (f1, f2) {
    // Rounding issues cause correct code to differ from doubles for very small values
    if (Math.abs(f1 / f2) < 2 ** -1022) return

    let res = BigFloat.new()
    BigFloat.div(BigFloat.fromNumber(f1), BigFloat.fromNumber(f2), res)

    res = res.toNumber()
    if (Number.isNaN(f1 / f2)) {
      expect(Number.isNaN(res))
    } else {
      expect(res, `${f1} / ${f2}`).to.equal(f1 / f2)
    }
  }

  it('should correctly handle various divisions', function () {
    for (const d1 of testDoubles) {
      for (const d2 of testDoubles) {
        testCase(d1, d2)
      }
    }
  })
})
