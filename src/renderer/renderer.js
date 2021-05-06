import {GLResourceManager} from "./gl_manager"
import {Color, Colors} from "../other/color"
import {glTriangleStripMonochrome} from "./render_calls"

/**
 * RENDERER
 *
 * the renderer does not only provide WebGL functionality. Elements can provide certain primitives which the renderer
 * knows how to draw. Perhaps the most basic is a simple raw geometry draw, which draws a given gl.POINTS, gl.TRIANGLES,
 * gl.TRIANGLE_STRIP, etc. geometry of a given color (and potentially with a linear transformation).
 */

// Example render call: { type: "gl_tri_strip_mono", elemID: "abcd-efgh", geometry: Float32Array([ ... ]), color: {r: 0, ...} }.
// the elemID is important because we want to be able to destroy unused buffers belonging to a given element and not thrash
// a single buffer.

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

  clearAndResizeTo (width, height) {
    // Changing the size of the canvas implicitly clears it, so only clear it if the width and height are unchanged.
    if (this.canvas.width === width && this.canvas.height === height)
      this.clearCanvas()
    else
      this.resizeTo(width, height)
  }

  /**
   * Get the parameters object that will be passed to the render functions returned by each object. Eventually this
   * object will have more information, but for now we're just including some basic info.
   */
  getRenderingParameters () {
    return {
      renderer: this,
      timeStart: Date.now()
    }
  }

  // We render a fully updated scene by clearing the rendering canvas, recursing into the scene, getting render
  // instructions for each element, then rendering them in order.
  renderScene (scene) {
    // For a scene to be rendered, it needs to be updated
    scene.updateAll()

    this.clearAndResizeTo(scene.width, scene.height) // TODO: dpi

    // These are passed to the render functions
    const renderingParameters = this.getRenderingParameters()

    const renderingInstructions = []

    scene.apply(child => {
      const instructions = child.getRenderingInstructions()

      renderingInstructions.push(instructions)
    })

    for (const instruction of renderingInstructions) {
      if (typeof instruction === "function") {
        instruction(renderingParameters)
      } else {
        // Eventually, the renderer will have an optimizer that will allow it to combine consecutive calls that use the
        // same drawing parameters. For example, 100 little black ticks could be combined into a single call, instead of
        // 100 drawArrays calls. For now, though, we just render each instruction in turn.
        switch (instruction?.type) {
          case "gl_tri_strip_mono":
            glTriangleStripMonochrome(renderingParameters, instruction)
            break
          default:
            break
        }
      }
    }
  }
}
