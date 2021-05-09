

// Copied code from Grapheme
const desiredDemarcationSeparation = 5

// Array of potential demarcations [a,b], where the small demarcations are spaced every b * 10^n and the big ones are spaced every a * 10^n
const StandardDemarcations = [[1, 0.2], [1, 0.25], [2, 0.5]]

function getDemarcation(start, end, distance) {
  let lowestError = Infinity
  let bestDemarcation
  let dist = end - start

  let desiredDemarcationCount = distance / desiredDemarcationSeparation
  let desiredDemarcationSize = dist / desiredDemarcationCount

  for (let demarcation of StandardDemarcations) {
    let a = demarcation[0]
    let b = demarcation[1]

    let power = Math.round(Math.log10(desiredDemarcationSize / b))
    let minorSize = 10 ** power * b

    let err = Math.abs(desiredDemarcationSize - minorSize)
    if (err < lowestError) {
      lowestError = err
      bestDemarcation = {power, major: a, minor: b}
    }
  }

  return bestDemarcation
}

function demarcate(start, end, demarcation) {
  const ret = []

  let modulus = demarcation.major / demarcation.minor

  let factor = 10 ** demarcation.power * demarcation.minor

  let start_i = Math.ceil(start / factor)
  let end_i = Math.ceil(end / factor)

  for (let i = start_i; i < end_i; ++i) {
    let pos = factor * i

    if (pos === 0) {
      ret.push({pos, type: "axis"})
    } else if (i % modulus === 0) {
      ret.push({pos, type: "major"})
    } else {
      ret.push({pos, type: "minor"})
    }
  }

  return ret
}

export const GridlineAllocators = {
  /**
   * Generate a list of gridlines, with type "axis", "major", and "minor", for a plotting box
   * @param xStart {number} The beginning of the x axis
   * @param xEnd {number} The end of the x axis
   * @param xLength {number} The length of the x axis
   * @param yStart {number} The beginning of the y axis
   * @param yEnd {number} The end of the y axis
   * @param yLength {number} The length of the y axis
   * @returns {IterableIterator<any>}
   * @constructor
   */
  Standard: function (xStart, xEnd, xLength, yStart, yEnd, yLength) {
    const ret = []

    let eggRatio = (xEnd - xStart) / (yEnd - yStart) * yLength / xLength
    let forceSameDemarcations = Math.abs(eggRatio - 1) < 0.3

    let demarcationX = getDemarcation(xStart, xEnd, xLength)

    let demarcationY
    if (forceSameDemarcations) {
      demarcationY = demarcationX
    } else {
      demarcationY = getDemarcation(yStart, yEnd, yLength)
    }

    for (let xMarker of demarcate(xStart, xEnd, demarcationX)) {
      ret.push({dir: 'x', pos: xMarker.pos, type: xMarker.type})
    }

    for (let yMarker of demarcate(yStart, yEnd, demarcationY)) {
      ret.push({dir: 'y', pos: yMarker.pos, type: yMarker.type})
    }

    return ret
  }
}

// Ticks can be allocated in various ways, not even necessarily for *ticks* on an axis; gridlines can be allocated this
// way too. The central problem boils down to being given a length of the axis and the axis's start and end values,
// then asking the allocator to generate a list of values at which ticks should be placed.

// TODO
class TickAllocator {
  constructor () {

  }

  allocateTicks (length, startValue, endValue) {
    // Considerations: the DPR is not particularly relevant here. Only the length in CSS pixels is relevant. Integers
    // and multiples of powers of ten are good candidates for subdivision.


  }
}
