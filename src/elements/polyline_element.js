import {Element} from "../core/element"
import {Pen} from "../other/pen"
import {calculatePolylineVertices} from "../algorithm/polyline_triangulation"
import {BoundingBox} from "../math/bounding_box"


export class PolylineElement extends Element {
  constructor (params={}) {
    super(params)

    this.set({
      vertices: [-1, 0.5, 1, 0.2],
      pen: new Pen()
    })
  }

  update () {

    // Calculate computed properties
    const { computedProps: comProps } = this

    // Forward needed properties and add defaults if needed
    const vertices = this.get("vertices")

    if (!vertices || vertices.length < 4)  {
      comProps.set("glVertices", null)
      return
    }

    let pen = this.get("pen")
    if (!pen) pen = new Pen()

    const glVertices = calculatePolylineVertices(vertices, pen, new BoundingBox(0, 0, 100, 100))

    this.computedProps.set("pen", pen)
    this.computedProps.set("glVertices", glVertices)
  }

  getRenderingInstructions () {
    return (renderer) => {
      const { gl, glManager, canvasWidth, canvasHeight, width, height } = renderer

      const tileLayerProgram = glManager.getProgram("Polyline") ?? glManager.createProgram("Polyline",
        `attribute vec2 vPosition;
       
        void main() {
            gl_Position = vec4(vPosition, 0, 1);
        }`, `
        precision highp float;
        uniform vec4 color;
        
        void main() {
          gl_FragColor = color;
        }`, ["vPosition"], ["color"])

      const buf = glManager.getBuffer(this.id)

      const { glVertices, vertexCount } = this.computedProps.get("glVertices")

      console.log(glVertices)

      gl.useProgram(tileLayerProgram.program)

      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, glVertices, gl.STATIC_DRAW)

      const pen = this.computedProps.get("pen")

      const vPosition = tileLayerProgram.attribs.vPosition

      gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(vPosition)

      const color = pen.color

      gl.uniform4f(tileLayerProgram.uniforms.color, color.r / 255, color.g / 255, color.b / 255, color.a / 255)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount)
    }
  }
}
