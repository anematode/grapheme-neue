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
        minor: DefaultStyles.gridlinesMinor,
        axis: DefaultStyles.gridlinesAxis
      },
      ticks: {}
    })
  }

  computeProps () {
    const { props } = this

    this.defaultInheritProps()
  }

  _update () {
    this.computeProps()

    const { gridlineStyles, plotTransform, ticks } = this.props.proxy

    const plottingBox = plotTransform.pixelCoordinatesBox()
    const { x1, y1, x2, y2} = plottingBox

    const instructions = []

    // We iterate over styles because "it's all we know how to draw"
    for (let [ style, pen ] of Object.entries(gridlineStyles)) {
      const lines = []

      for (let dir of [ 'x', 'y' ]) {
        const thisTicks = ticks[dir][style]

        if (!thisTicks) continue

        for (let tick of thisTicks) {
          // Generate the individual line
          if (dir === 'x') {
            tick = plotTransform.graphToPixelX(tick)
            lines.push(NaN, NaN, tick, y1, tick, y2)
          } else {
            tick = plotTransform.graphToPixelY(tick)
            lines.push(NaN, NaN, x1, tick, x2, tick)
          }
        }
      }

      // Having computed the lines for this style we push it onto the list of instructions
      if (lines.length > 0) instructions.push({ type: "polyline", vertices: lines, pen, zIndex: 0 })
    }

    this.internal.instructions = instructions
  }

  getRenderingInstructions() {
    return this.internal.instructions
  }
}
