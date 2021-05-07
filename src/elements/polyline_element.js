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
 * should be in CSS pixels. Let's extensively comment this to understand how this will work.
 */
export class PolylineElement extends Element {
  constructor (params={}) {
    // Parameters: vertices in pixels, pen is Pen, sceneDimensions
    super(params)

    this.set({ pen: "black" })
  }

  _set (propName, value) {
    // In this case, the values of "vertices" and "pen" may be modified after, during preprocessing
    switch (propName) {
      case "vertices": case "pen":
        this.props.setPropertyValue(propName, value)
    }
  }

  /**
   * Preprocess the vertices attribute, turning it into a flat array
   * @private
   */
  #_flattenVertices () {
    const { props } = this

    const vertices = props.getPropertyValue("vertices")
    props.setPropertyValue("vertices", flattenVec2Array(vertices))
  }

  /**
   * Compute the props, including preprocessing of "vertices" and "pen" as appropriate
   */
  computeProps () {
    const { props } = this

    this.defaultInheritProps()

    // Process vertices if changed
    if (props.hasPropertyChanged("vertices"))
      this.#_flattenVertices()

    // Convert pen to pen object
    if (props.hasPropertyChanged("pen")) {
      const pen = props.getPropertyValue("pen")

      props.setPropertyValue("pen", Pen.fromObj(pen))
    }
  }

  _update () {
    this.computeProps()

    const { props, internal } = this

    if (props.havePropertiesChanged(["pen", "vertices", "sceneDimensions"])) {
      const [ pen, vertices, sceneDimensions ] = props.getPropertyValues(["pen", "vertices", "sceneDimensions"])

      // Invalid parameters
      if (!vertices || vertices.length < 4 || !sceneDimensions) {
        internal.geometry = null
      } else {
        internal.geometry = calculatePolylineVertices(vertices, pen, sceneDimensions.getBoundingBox())
        internal.color = pen.color
      }
    }
  }

  getRenderingInstructions () {
    const { geometry, color, xyScale } = this.internal
    console.log(geometry)

    return {
      // The type of instruction
      type: "gl_tri_strip_mono",
      // The id of the element
      elemID: this.id,
      // An object { glVertices, vertexCount }
      geometry,
      // RGBA
      color
    }
  }
}
