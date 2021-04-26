import {GLResourceManager} from "./gl_manager"
import {Color, Colors} from "../other/color"

export class WebGLRenderer {
  constructor (params={}) {
    const glCanvas = document.createElement("canvas")
    const glContext = glCanvas.getContext("webgl2")

    this.canvas = glCanvas
    this.gl = glContext
    this.glManager = new GLResourceManager(this.gl)

    this.extensions = {
      timerQuery: this.gl.getExtension("EXT_disjoint_timer_query_webgl2")
    }
  }

  clearCanvas () {
    const gl = this.gl

    gl.clearColor(0, 0, 0, 0)
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
    //console.time("update")
    scene.apply(child => {
      if (child.updateStage !== -1) child.update()
    })
    //console.timeEnd("update")

    // If the renderer and scene have the same size, clear the canvas; if not, we resize the canvas which clears it
    if (this.canvas.width === scene.width && this.canvas.height === scene.height)
      this.clearCanvas()
    else
      // Fit scene
      this.resizeTo(scene.width, scene.height)

    const renderingInstructions = []

    // This function is applied to every element in the scene
    scene.apply(child => {
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
