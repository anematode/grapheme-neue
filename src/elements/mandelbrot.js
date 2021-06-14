import {Element} from "../core/element"

// for the memes
class MandelbrotViewer extends Element {
  init (params) {

  }

  _update () {
    this.defaultInheritProps()
  }

  getRenderingInfo () {
    let plotTransform = this.props.get("plotTransform")

    return { type: "function", function: (renderer) => {
      const { glManager, gl } = renderer

      const mandelbrotProgram = glManager.getProgram("Mandelbrot") ?? glManager.createProgram("Mandelbrot", `
      
      `, `
      
      `)
    }}
  }
}
