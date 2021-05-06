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

  _set (propName, value) {
    switch (propName) {
      case "vertices":
        // In this case, the value of "vertices" may be modified after, during preprocessing
        this.props.setPropertyValue("vertices", value)
        break
      case "pen":
        // May also be processed
        this.props.setPropertyValue("pen", value)
    }
  }

  computeProps () {
    // Do preprocessing of vertices, etc.
    const {props} = this

    // Inherit needed computed props, in this case sceneDimensions, which will be given to the polyline program. Of
    // course in the future this information could just be passed through the renderer, but also note that giving
    // the bounding rectangle of the screen allows us to cull vertices/parts of the line that are offscreen.

    this.defaultInheritProps()

    // Calculate the other computed properties, specific to this element, namely vertices and pen. They are just
    // forwarded from the given properties, except they are preprocessed into a uniform format. For example, the
    // vertices may be given as [Vec2(3, 4), Vec2(1, 5), ..., Vec2(150, 302)], while the internal function that
    // actually calculates the geometries of the polyline (namely, calculatePolylineVertices) needs a flattened array
    // of floats. There is indeed a small overhead to checking over all the points, but this overhead is small in
    // comparison to other computations.

    if (props.hasPropertyChanged("vertices")) {
      const vertices = props.getPropertyValue("vertices")

      props.setPropertyValue("vertices", flattenVec2Array(vertices))
    }

    if (props.hasPropertyChanged("pen")) {
      const pen = props.getPropertyValue("pen")

      props.setPropertyValue("pen", Pen.fromObj(pen))
    }
  }

  update () {
    if (this.updateStage === 100) return

    this.computeProps()

    const { props, internal } = this

    if (props.havePropertiesChanged(["pen", "vertices", "sceneDimensions"])) {
      const [ pen, vertices, sceneDimensions ] = props.getPropertyValues(["pen", "vertices", "sceneDimensions"])

      // Invalid parameters
      if (!vertices || vertices.length < 4 || !sceneDimensions) {
        internal.geometry = null
      } else {
        let geometry = internal.geometry = calculatePolylineVertices(vertices, pen ?? new Pen(), sceneDimensions.getBoundingBox())

        internal.color = pen.color

        // Scaling vector to transform CSS pixels into clip space. We use width and height instead of canvasWidth and
        // canvasHeight.
        internal.xyScale = [ 2 / sceneDimensions.width, -2 / sceneDimensions.height ]
      }
    }

    this.updateStage = 100
  }

  getRenderingInstructions () {
    const {vertexCount, geometry, color, xyScale} = this.internal

    // For now we keep the code in here; later it will just return an abstract geometry and the renderer and do its
    // fancy optimizations
    return {
      type: "gl_tri_strip_mono", // needed for all instructions
      elemID: this.id, // needed for all instructions
      geometry,
      color,
      xyScale
    }
  }
}
