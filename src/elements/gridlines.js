import {Element} from "../core/element"
import {Pen} from "../other/pen"
import {DefaultStyles} from "../styles/default"
import {calculatePolylineVertices} from "../algorithm/polyline_triangulation"

// A relatively primitive element that simply takes in a list of gridline types and gridline styles for each type, then
// gridline positions.

// Properties:
// gridlineStyles: { major: Pen(), minor: Pen() }
// gridlinePositions: { major: {x: [0, 100, 200, 300, 400], y: [0, 100, 200, 300, 400]}, minor: {x: [0, 10, 20, 30, 40, 50], y: [0, 10, 20, 30, 40, 50] }
// plottingBox: (inherited)

export class GridlinesElement extends Element {
  constructor (params) {
    super(params)

    this.props.setMultipleProperties({
      gridlineStyles: {
        major: DefaultStyles.gridlinesMajor,
        minor: DefaultStyles.gridlinesMinor
      },
      gridlinePositions: {}
    })
  }

  _set (propName, value) {
    const { props } = this

    // This is pain. We need to get the forwarding system done soon
    switch (propName) {
      case "majorStyle":
        props.getPropertyValue("gridlineStyles").major = value
        props.markChanged("gridlineStyles")

        break
      case "minorStyle":
        props.getPropertyValue("gridlineStyles").minor = value
        props.markChanged("gridlineStyles")

        break
      case "majorGridlinePositions":
        props.getPropertyValue("gridlinePositions").major = value
        props.markChanged("gridlinePositions")

        break
      case "minorGridlinePositions":
        props.getPropertyValue("gridlinePositions").minor = value
        props.markChanged("gridlinePositions")

        break
      case "gridlinePositions":
        props.setPropertyValue("gridlinePositions", value)
    }
  }

  get (propName) {
    const { props } = this

    switch (propName) {
      case "majorStyle":
        return props.gridlineStyles.major
      case "minorStyle":
        return props.gridlineStyles.minor
    }
  }

  computeProps () {
    const { props } = this

    this.defaultInheritProps()
  }

  _update () {
    this.computeProps()

    const { gridlineStyles, gridlinePositions, plotTransform } = this.props.proxy
    const plottingBox = plotTransform.pixelCoordinatesBox()

    const geometries = []

    const instructions = []
    const addLine = (vertices, pen) => {
      let geometry = calculatePolylineVertices(vertices, pen, null)

      geometries.push(geometry)
    }

    // This is purposely painful to stress test the renderer. Normally we could just have two geometries, one for major
    // and one for minor.

    for (let key in gridlineStyles) {
      if (gridlineStyles.hasOwnProperty(key)) {

        let positions = gridlinePositions[key]

        if (!positions) continue
        let pen = gridlineStyles[key]

        if (positions.x) {
          for (const y of positions.x) {
            addLine([ plottingBox.x, y, plottingBox.getX2(), y], pen)
          }
        }

        if (positions.y) {
          for (const x of positions.y) {
            addLine([ x, plottingBox.y, x, plottingBox.getY2()], pen)
          }
        }
      }
    }

    const geos = geometries.map(geo => geo.glVertices)

    const len = geos.reduce((a, b) => a + b.length, 0)
    const arr = new Float32Array(len + geos.length * 2)

    let i = 0
    for (const geo of geos) {
      arr.set(geo, i)
      i += geo.length
      arr[i] = NaN
      arr[i + 1] = NaN
      i += 2
    }

    this.internal.instructions = [{
      type: "gl_tri_strip_mono",
      geometry: arr,
      color: { r: 0, g: 0, b: 0, a: 255 }
    }]
  }

  getRenderingInstructions() {
    return this.internal.instructions.concat({ type:"debug", rectangle: [0, 5, 200, 10] }, { type: "text", font: "12px Verdana", x: 100, y: 100, text: "hello" }, { type: "text", font: "60px Verdana", x: 100, y: 400, text: "jello" })
  }
}
