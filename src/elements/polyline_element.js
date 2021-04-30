import {Element} from "../core/element"
import {Pen} from "../other/pen"
import {calculatePolylineVertices} from "../algorithm/polyline_triangulation"
import {isTypedArray} from "../core/utils"


function _flattenVec2ArrayInternal(arr) {
  const out = []

  for (let i = 0; i < arr.length; ++i) {
    let item = arr[i]

    if (item === null) {
      out.push(NaN, NaN)
    } else if (item.x !== undefined && item.y !== undefined) {
      out.push(item.x, item.y)
    } else {
      if (typeof item === "number") out.push (item)
      else throw new TypeError(`Unknown item ${item} at index ${i} in Vec2 array equivalent`)
    }
  }

  return out
}

// Given some arbitrary array of Vec2s, turn it into the regularized format [x1, y1, x2, y2, ..., xn, yn]. The end of
// one polyline and the start of another is done by one pair of numbers being NaN, NaN.
function flattenVec2Array (arr) {
  if (isTypedArray(arr)) return arr

  for (let i = 0; i < arr.length; ++i) {
    if (typeof arr[i] !== "number") return _flattenVec2ArrayInternal(arr)
  }

  return arr
}

/**
 * A good test element: we give it a pen of some sort and it should draw a polyline with the given vertices. The vertices
 * should be in CSS pixels. So we can extensively comment this to understand how this will work.
 */
export class PolylineElement extends Element {
  constructor (params={}) {
    // Parameters: vertices in pixels, pen is Pen, sceneDimensions
    super(params)
  }

  update (updateParams) {
    if (this.updateStage === -1) return

    /**
     * COMPUTE THE COMPUTED PROPS
     */

    const { props, computedProps } = this

    // Inherit needed computed props, in this case sceneDimensions, which will be given to the polyline program. Of
    // course in the future this information could just be passed through the renderer, but also note that giving
    // the bounding rectangle of the screen allows us to cull vertices/parts of the line that are offscreen.
    this._defaultInheritProps()

    // Calculate the other computed properties, specific to this element, namely vertices and pen. They are just
    // forwarded from the given properties, except they are preprocessed into a uniform format. For example, the
    // vertices may be given as [Vec2(3, 4), Vec2(1, 5), ..., Vec2(150, 302)], while the internal function that
    // actually calculates the geometries of the polyline (namely, calculatePolylineVertices) needs a flattened array
    // of floats. There is indeed a small overhead to checking over all the points, but this overhead is small in
    // comparison to other computations.
    if (props.needsUpdate) {
      if (props.hasChanged("vertices"))
        computedProps.set("vertices", flattenVec2Array(props.get("vertices")))

      if (props.hasChanged("pen"))
        computedProps.set("pen", Pen.fromObj(props.get("pen")))

      // At this point, the props have been taken care of and we can mark props as not needing an update.
      props.needsUpdate = false
    }

    // We need to update the internal rendering data if the relevant computed properties have changed. Note that "pen"
    // may not have changed by reference, but changed by value; same with vertices, actually.
    update: if (computedProps.needsUpdate) {
      const { internal } = this

      const pen = computedProps.get("pen")
      const vertices = computedProps.get("vertices")
      const sceneDimensions = computedProps.get("sceneDimensions")

      if (!vertices || !pen || vertices.length < 4 || !sceneDimensions) {
        internal.geometry = null
        break update // Feeling like a C programmer
      }

      // Consists of { glVertices: Float32Array( ... ), vertexCount: n }.
      internal.geometry = calculatePolylineVertices(vertices, pen, sceneDimensions.getBBox())
      internal.color = pen.color

      // Scaling vector to transform CSS pixels into clip space. We use width and height instead of canvasWidth and
      // canvasHeight.
      internal.xy_scale = [ 2 / sceneDimensions.width, -2 / sceneDimensions.height ]
    }

    this.updateStage = -1
  }

  getRenderingInstructions () {
    // For now we keep the code in here; later it will just return an abstract geometry and the renderer and do its
    // fancy optimizations
    return (renderingParams) => {
      const renderer = renderingParams.renderer
      const { gl, glManager } = renderer
      const { internal } = this

      if (!internal.geometry) return

      const polylineProgram = glManager.getProgram("Polyline") ?? glManager.createProgram("Polyline",
        `attribute vec2 v_position;
        
        uniform vec2 xy_scale;
        vec2 displace = vec2(-1, 1);
         
        void main() {
            gl_Position = vec4(v_position * xy_scale + displace, 0, 1);
        }`, `
        precision highp float;
        uniform vec4 color;
        
        void main() {
          gl_FragColor = color;
        }`, ["v_position"], ["color", "xy_scale"])

      const buf = glManager.getBuffer(this.id)

      const { glVertices, vertexCount } = internal.geometry

      gl.useProgram(polylineProgram.program)

      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, glVertices, gl.STATIC_DRAW)

      const vPosition = polylineProgram.attribs.v_position

      gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(vPosition)

      const color = this.internal.color

      gl.uniform4f(polylineProgram.uniforms.color, color.r / 255, color.g / 255, color.b / 255, color.a / 255)
      gl.uniform2fv(polylineProgram.uniforms.xy_scale, internal.xy_scale)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount)
    }
  }
}
