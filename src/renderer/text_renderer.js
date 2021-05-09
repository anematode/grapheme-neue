import {packRectangles, potpack} from "../algorithm/rectangle_packing"

// There will eventually be multiple ways to draw text in Grapheme. For now, we will use a 2D canvas that essentially
// draws text to be copied into a WebGL texture which is then rendered.

// To be very precise about all this, the renderer maps an entry of the form
// { text: "bruh", font: "italic 20px serif", baseline? : "alphabetical" }
// to rendering information of the form
// { tx1: 0.005, ty1: 0.401, tx2: 0.010, ty2: 0.408, ascent: 15, descent: 3, width: 15 }
// which encodes two things: the position of the text on the canvas in texture coords, and ascent/descent relative to the given
// baseline, and its width, the latter three params in pixels. The result is not returned immediately, but returned
// when requested, at which point the text currently enqueued will all be allocated. Text will not be deleted or
// reallocated until the session is over.

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

// For now let's just use a basic repeated packing. I'm tired

export class TextRenderer {
  constructor () {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")

    // Map: font -> Map: text -> info (will implement baseline later)
    this.textLocations = new Map()

    this.drawQueue = []

    this.startSession()
  }

  getFontStore (font) {

  }

  startSession () {
    this.ctx.textAlign = "left"
    this.clearText()
  }

  clearText () {
    this.textLocations.clear()
  }

  draw (textInfo) {
    this.drawQueue.push(textInfo)
  }

  getMetrics (textInfo) {
    const { ctx } = this

    ctx.font = textInfo.font

    return ctx.measureText(textInfo.text)
  }

  runQueue () {
    // Get the bounding boxes of each element in the queue. Eventually we'll use a dynamic allocator. Oh well. We sort
    // by font

    const { drawQueue } = this

    drawQueue.sort((c1, c2) => (c1.font < c2.font))

    const rects = []

    for (const draw of drawQueue) {
      const metrics = this.getMetrics(draw)

      const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

      draw.metrics = metrics
      draw.rect = { w: Math.ceil(width), h: Math.ceil(height) }

      rects.push(draw.rect)
    }

    potpack(rects)

    for (const draw of drawQueue) {
      this.textLocations.set(draw.text, draw)
    }

    this.drawQueue = []
  }

  get (textInfo) {

  }
}
