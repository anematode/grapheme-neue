import {packRectangles, potpack} from "../algorithm/rectangle_packing"
import {getVersionID, nextPowerOfTwo} from "../core/utils"

// There will eventually be multiple ways to draw text in Grapheme. For now, we will use a 2D canvas that essentially
// draws text to be copied into a WebGL texture which is then rendered.

// To be very precise about all this, the renderer maps an entry of the form*
// { text: "bruh", font: "2 20px serif", baseline? : "alphabetical" }
// to rendering information of the form
// { tx1: 0.005, ty1: 0.401, tx2: 0.010, ty2: 0.408, ascent: 15, descent: 3, width: 15 }
// which encodes two things: the position of the text on the canvas in texture coords, and ascent/descent relative to the given
// baseline, and its width, the latter three params in pixels. The result is not returned immediately, but returned
// when requested, at which point the text currently enqueued will all be allocated. Text will not be deleted or
// reallocated until the session is over.

// *Note that the number before the normal font is the shadow radius: a white strokeText drawn below the text itself

// A given entry is only valid during a given session. For example:

// renderer.startSession()
// renderer.draw({ text: "bruh", font: ... })
// renderer.draw({ text: "goat", font: ... })
// ...
// renderer.get({ text: "bruh", font ... })  -> { tx1, ty1 ... }

// In the future, old text could be cached so that it wouldn't have to be drawn every frame--that isn't too difficult,
// although the algorithm for deleting old cached text and replacing them with new ones is a bit finnicky. Indeed,
// understanding how to pack the text at all is an annoying operation even without caching, as it's another rectangle
// packing problem. I will have to do research and write some algorithms for that problem, eventually.

export class TextRenderer {
  constructor () {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")

    // Map: font -> Map: text -> info (will implement baseline later)
    this.textLocations = new Map()

    this.drawQueue = []
    this.version = -1
  }

  /**
   * Get the location of a piece of text on the canvas, again given a font and a text. Returns undefined if it doesn't
   * exist. It gives { rect, font, metrics }
   * @param textInfo {{ font: {string}, text: {string} }}
   */
  getTextLocation (textInfo={}) {
    let { font, fontSize, shadowRadius, text } = textInfo

    if (!shadowRadius) shadowRadius = 0

    return this.textLocations.get(`${shadowRadius} ${fontSize}px ${font}`)?.get(text)
  }

  /**
   * Clear out all previous text stores. In the future, when doing a dynamic text packing, this will be called sometimes
   * to do a reallocation.
   */
  clearText () {
    this.textLocations.clear()
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Parameters describing a given piece of text, sans color and position. More specifically, that means a font and a
   * string of text.
   * @param textInfo {{ font: {string}, text: {string} }}
   */
  draw (textInfo) {
    this.drawQueue.push(textInfo)
  }

  getMetrics (textInfo) {
    const { ctx } = this

    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"

    ctx.font = `${textInfo.fontSize}px ${textInfo.font}`

    return ctx.measureText(textInfo.text)
  }

  resizeCanvas (width, height) {
    this.canvas.width = width
    this.canvas.height = height

    const { ctx } = this

    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
  }

  runQueue () {
    // Get the bounding boxes of each element in the queue. Eventually we'll use a dynamic allocator. Oh well. We sort
    // by font

    const { drawQueue, ctx } = this
    const padding = 2

    drawQueue.sort((c1, c2) => (c1.font < c2.font))

    const rects = []

    for (const draw of drawQueue) {
      const metrics = this.getMetrics(draw)

      const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

      if (!draw.shadowRadius) draw.shadowRadius = 0

      draw.metrics = metrics
      draw.rect = { w: Math.ceil(width) + padding + 2 * draw.shadowRadius, h: Math.ceil(height) + padding + 2 * draw.shadowRadius }

      rects.push(draw.rect)
    }

    const { w, h } = potpack(rects)
    const canvasWidth = nextPowerOfTwo(w), canvasHeight = nextPowerOfTwo(h)

    this.resizeCanvas(canvasWidth, canvasHeight)
    this.clearText()

    ctx.fillStyle = "black"

    // Each draw is now { metrics: TextMetrics, rect: {w, h, x, y},
    for (const draw of drawQueue) {
      ctx.font = `${draw.fontSize}px ${draw.font}`

      let [ x, y ] = [ draw.rect.x + draw.metrics.actualBoundingBoxLeft + draw.shadowRadius, draw.rect.y + draw.metrics.actualBoundingBoxAscent + draw.shadowRadius ]

      if (draw.shadowRadius) {
        ctx.strokeStyle = "white"
        ctx.lineWidth = draw.shadowRadius

        ctx.strokeText(draw.text, x, y)

        ctx.fillStyle = "black"
      }

      ctx.fillText(draw.text, x, y)
      draw.rect.w -= padding
      draw.rect.h -= padding
    }

    let store
    let currentStore

    // Last task is to store the text and font positions
    for (const draw of drawQueue) {
      let drawStore = `${draw.shadowRadius ?? 0} ${draw.fontSize}px ${draw.font}`

      if (drawStore !== currentStore) {
        store = new Map()
        currentStore = drawStore
        this.textLocations.set(currentStore, store)
      }

      store.set(draw.text, draw)
    }

    this.drawQueue = []

    this.version = getVersionID()
  }
}
