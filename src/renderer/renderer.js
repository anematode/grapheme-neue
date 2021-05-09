import {GLResourceManager} from "./gl_manager"
import {Color, Colors} from "../other/color"
import {glDebug, glText, glTriangleStripMonochrome} from "./render_calls"
import {TextRenderer} from "./text_renderer"

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
    this.textRenderer = new TextRenderer()
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

  }

  // We render a fully updated scene by clearing the rendering canvas, recursing into the scene, getting render
  // instructions for each element, then rendering them in order.
  renderScene (scene) {

    // For a scene to be rendered, it needs to be updated
    scene.updateAll()

    let renderingInstructions = []

    // These are passed to the render functions
    const renderingParameters = {
      renderer: this,
      timeStart: Date.now()
    }


    scene.apply(child => {
      const instructions = child.getRenderingInstructions()

      renderingInstructions.push(instructions)
    })

    renderingInstructions = renderingInstructions.flat()

    this.clearAndResizeTo(scene.width, scene.height) // TODO: dpi

    const { textRenderer } = this

    // Get all text instructions and add them to the text renderer's list of text that is needed
    for (const instruction of renderingInstructions) {
      if (instruction?.type === "text") {
        textRenderer.draw(instruction)
      }
    }

    textRenderer.runQueue()

    console.log("Total number of instructions: ", renderingInstructions.length)

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
          case "debug":
            glDebug(renderingParameters, instruction)
            break
          case "text":
            glText(renderingParameters, instruction, textRenderer)
            break
          default:
            break
        }
      }
    }
  }

  renderDOMScene (scene) {
    this.renderScene(scene)

    console.time("hi")

    createImageBitmap(this.canvas).then(bitmap => {
      scene.bitmapRenderer.transferFromImageBitmap(bitmap)
      console.timeEnd("hi")
    })
  }
}
