import {GLResourceManager} from "./gl_manager"
import {Color, Colors} from "../other/color"

export class WebGLRenderer {
  constructor (params={}) {
    const glCanvas = document.createElement("canvas")
    const glContext = glCanvas.getContext("webgl2")

    /**
     * @type {HTMLCanvasElement}
     */
    this.canvas = glCanvas

    /**
     * @type { WebGLRenderingContext}
     */
    this.gl = glContext
    this.glManager = new GLResourceManager(this.gl)

    this.extensions = {
      timerQuery: this.gl.getExtension("EXT_disjoint_timer_query_webgl2")
    }
  }

  clearCanvas (color = Colors.TRANSPARENT) {
    const clearColor = new Color(color).glColor()

    const gl = this.gl

    gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  /**
   * Resize to the actual canvas buffer size. the DPI stuff is done in the scene.
   * @param width
   * @param height
   */
  resizeTo (width, height) {
    this.canvas.width = width
    this.canvas.height = height

    this.gl.viewport(0, 0, width, height)
  }

  // We render a fully updated scene by clearing the rendering canvas, recursing into the scene, getting render
  // instructions for each element, then rendering them in order.
  renderScene (scene) {
    scene.update()

    if (this.canvas.width === scene.width && this.canvas.height === scene.height)
      this.clearCanvas()
    else
      // Fit scene
      this.resizeTo(scene.width, scene.height)

    scene.applyRecursively(child => {
      child.update()
    })

    const renderingInstructions = []

    // This function is applied to every element in the scene
    scene.applyRecursively(child => {
      const instructions = child.getRenderingInstructions(this)

      renderingInstructions.push(instructions)
    })

    for (const instruction of renderingInstructions) {
      if (typeof instruction === "function") {
        instruction(this)
      }
    }
  }
}
