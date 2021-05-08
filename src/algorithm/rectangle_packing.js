
// A rather common operation for generating texture atlases and the like.

// Takes in an array of rectangles and returns a packing of those rectangles as a list of x and y coordinates
// The code fucking sucks, whatever, I just want text working ASAP
// TODO: Chazelle packing
export function packRectangles (rectangles) {
  // For now, just find the maximum size and repeat that.
  let rectWidth = 0, rectHeight = 0
  for (const rectangle of rectangles) {
    rectWidth = Math.max(rectWidth, rectangle.w)
    rectHeight = Math.max(rectHeight, rectangle.h)
  }

  let rectangleCount = rectangles.length
  let sqrtRectangleCount = Math.floor(Math.sqrt(rectangleCount))

  // The question is what arrangement of rectangles brings us to the smallest (by area) total bounding rectangle that
  // has sides that are both powers of two. We consider rectangles of the ratios 2:1, 1:1 and 1:2.

  const totalArea = rectWidth * rectHeight * rectangleCount
  let nextPowerOfTwo = Math.ceil(Math.floor(Math.log2(totalArea)))
  let textureWidth, textureHeight
  let rectXCount, rectYCount

  function tryPacking (width, height) {
    if (textureWidth) return

    const minYCount = Math.floor(height / rectHeight)
    let minXCount = Math.floor(width / rectWidth)

    let correspondingXCount = Math.ceil(rectangleCount / minYCount)

    if (correspondingXCount <= minXCount) {
      // Then a packing of minYCount rectangles tall and correspondingXCount rectangles wide will suffice, in a bounding
      // box of textureWidth x textureHeight

      textureWidth = width
      textureHeight = height
      rectYCount = minYCount
      rectXCount = correspondingXCount
    }
  }

  while (!textureWidth) {
    if (nextPowerOfTwo % 2 !== 0) {
      let width = 1 << (nextPowerOfTwo / 2)
      let height = 1 << (nextPowerOfTwo / 2 + 1)

      tryPacking(width, height)
      tryPacking(height, width)
    } else {
      const sideLen = 1 << (nextPowerOfTwo / 2)
      tryPacking(sideLen, sideLen)
    }

    nextPowerOfTwo++
  }

  let rects = []

  for (let i = 0; i < rectangleCount; ++i) {
    let x = i % rectXCount
    let y = Math.floor(i / rectXCount)
    let rect = rectangles[i]

    rects.push({x: x * rectWidth, y: y * rectHeight, w: rect.w, h: rect.h })
  }

  return { width: textureWidth, height: textureHeight, rects }
}

export class DynamicRectanglePacker {
  constructor () {
    // Given rectangles, packs them

    // Maps rectangle ids to rectangles { x, y, w, h }
    this.rects = new Map()

    this.queue = []
  }

  // Queue a rectangle of some width and height
  queueRectangle (id, width, height) {
    this.queue.push({ id, w: width, h: height})
  }
}
