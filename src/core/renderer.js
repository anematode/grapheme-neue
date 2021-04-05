

class WebGLRenderer {
  constructor (params={}) {

    const glCanvas = document.createElement("canvas")
    const glContext = glCanvas.getContext("webgl2")

    this.canvas = glCanvas
    this.gl = glContext
  }

  resizeTo (width, height) {
    this.canvas.width = width
    this.canvas.height = height
  }


}
