import {Element} from "../core/element"
import {constructInterface} from "../core/interface"

// An axis is relatively general. It simply abstracts the concept of a start and end and allows a bunch of other
// baubles like ticks, labels, etc. For now we'll just do text.

// Okay, let's use axis as a test for a more complex interface. For now, let's have the following properties:

// ticks: undefined or dictionary of places to put ticks (major: [ ... ], minor: [ ... ])
// tickStyles: dictionary of

const axisInterface = constructInterface({
  ticks: true,
  start: true,
  end: true,
  startGraphX: true,
  endGraphX: true
})

export class AxisElement extends Element {
  getInterface () {
    return axisInterface
  }

  _update () {
    const { ticks, start, end, startGraphX, endGraphX } = this.props.proxy

    let instructions = this.internal.instructions = []
    let axisDisplacement = end.sub(start)
    let axisUnitDisplacement = axisDisplacement.unit()

    for (const tick of ticks) {
      let position = axisDisplacement.mul((tick - startGraphX) / (endGraphX - startGraphX)).add(start)

      instructions.push({ type: "polyline", vertices: [ position, position.add(axisUnitDisplacement.rotDeg(90).mul(15)) ], pen: { thickness: 3 } } )

      instructions.push({ type: "text", text: '' + tick, font: "sans-serif", fontSize: 16, position, anchorDir: axisUnitDisplacement.rotDeg(-90), spacing: 8, shadowRadius: 6 })
    }
  }

  getRenderingInstructions() {
    return this.internal.instructions
  }
}
