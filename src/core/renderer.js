
const renderers = []

class Renderer {
  constructor() {
    renderers.push(this)

    this.width = 1000
  }

  /**
   * Set the height of the renderer in pixels, not CSS pixels.
   * @param pxWidth
   * @param pxHeight
   * @private
   */
  _setSize (pxWidth, pxHeight) {

  }

  destroy() {
    const index = renderers.indexOf(this)

    renderers.splice(index, 1)
  }
}
