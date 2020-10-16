import {GLResourceManager} from "./gl_manager.js"
import {Eventful} from "./eventful.js"

const universes = []

// Delete buffers with the given name from all Grapheme Universes
function deleteBuffersNamed (bufferNames) {
  if (Array.isArray(bufferNames)) {
    for (let i = 0; i < bufferNames.length; ++i) {
      deleteBuffersNamed(bufferNames[i])
    }

    return
  }

  universes.forEach(universe => {
    universe.glManager.deleteBuffer(bufferNames)
  })
}

/**
 * Universe for plots to live in. Allows WebGL rendering, et cetera, and is intended to be shared by several children.
 */
class Universe extends Eventful {
  /**
   * Construct a new GraphemeUniverse.
   */
  constructor () {
    super()

    // Add this to the list of all extant universes
    universes.push(this)

    /**
     * Array of PLOTS using this Universe
     * @type {Array<Plot>}
     */
    this.children = []

    /**
     * Internal canvas that should not be placed into the document
     * @type {HTMLCanvasElement}
     */
    this.glCanvas = document.createElement('canvas')

    /**
     * GL context for children to use
     * @type {WebGLRenderingContext}
     */
    this.gl = this.glCanvas.getContext('webgl')

    if (!this.gl) throw new Error('Grapheme needs WebGL to run! Sorry.')

    /**
     * GL manager
     * @type {GLResourceManager}
     */
    this.glManager = new GLResourceManager(this.gl)
  }

  /**
   * Set the size of the canvas to width and height. This is used internally; the user should never have to call it.
   * @param width {number} The width of the canvas.
   * @param height {number} The height of the canvas.
   * @private
   */
  _setSize (width, height) {
    const glCanvas = this.glCanvas

    glCanvas.width = width
    glCanvas.height = height
  }

  /**
   * Add canvas to this universe
   * @param canvas {GraphemeCanvas} Canvas to add to this universe
   */
  add (canvas) {
    if (canvas.universe !== this) {
      throw new Error('Canvas already part of a universe')
    }
    if (this.isChild(canvas)) {
      throw new Error('Canvas is already added to this universe')
    }

    this.children.push(canvas)
  }

  /**
   * Clear the WebGL canvas for rendering.
   */
  clear () {
    let gl = this.gl

    // Set the clear color to transparent black
    gl.clearColor(0, 0, 0, 0)

    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  /**
   * Copy the contents of the WebGL canvas on top of the plot canvas
   * @param canvas {GraphemeCanvas}
   */
  copyToCanvas (canvas) {
    const ctx = canvas.ctx

    // Set the canvas transform to identity (since this.glCanvas does not factor in the device pixel ratio)
    ctx.resetTransform()

    // Draw the glCanvas to the plot canvas with drawImage
    ctx.drawImage(this.glCanvas, 0, 0)

    // Reset the canvas transform
    canvas.resetCanvasCtxTransform()
  }

  /**
   * Destroy this universe and all of its children
   */
  destroy () {
    // Remove universe from list of universes handled by utils
    utils.removeUniverse(this)

    // Destroy all child children
    this.children.forEach(canvas => canvas.destroy())
  }

  /**
   * Expand the canvas to fit the max dimensions of all governed children. Called every time a canvas is rendered, so it
   * ought to be fast.
   */
  expandToFit () {
    let maxWidth = 1
    let maxHeight = 1

    for (let i = 0; i < this.children.length; ++i) {
      let canvas = this.children[i]

      // Set max dims. Note we use canvasWidth/Height instead of width/height because glCanvas does not factor in dpr.
      if (canvas.canvasWidth > maxWidth) {
        maxWidth = canvas.canvasWidth
      }
      if (canvas.canvasHeight > maxHeight) {
        maxHeight = canvas.canvasHeight
      }
    }

    this._setSize(maxWidth, maxHeight)
  }

  /**
   * Whether canvas is a child of this universe
   * @param canvas Canvas to test
   * @returns {boolean} Whether canvas is a child
   */
  isChild (canvas) {
    return this.children.indexOf(canvas) !== -1
  }

  /**
   * Remove canvas from this universe
   * @param canvas Canvas to remove
   */
  remove (canvas) {
    let index = this.children.indexOf(canvas)

    if (index !== -1) {
      this.children.splice(index, 1)
    }
  }
}

// The DefaultUniverse is the default universe that children use. Other universes can be used by creating them, then passing
// them in the constructor to the plot. Because the number of WebGL contexts per page is limited to six, it's best to just
// use the DefaultUniverse; an unlimited number of children can use the same universe, and the number of Canvas2DRendering
// contexts per page is not capped.
const DefaultUniverse = new Universe()

export { Universe, DefaultUniverse }
