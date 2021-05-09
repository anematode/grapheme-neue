import {Scene} from "./scene"

/**
 * A scene endowed with an actual DOM element.
 */
export class InteractiveScene extends Scene {
  constructor (params={}) {
    super(params)

    this.domElement = document.createElement("canvas")
    this.bitmapRenderer = this.domElement.getContext("bitmaprenderer")
  }

  resizeCanvas () {
    this.domElement.width = this.width
    this.domElement.height = this.height
  }

  setSize (...args) {
    super.setSize(...args)
    this.resizeCanvas()
  }
}
