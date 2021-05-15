import {Element} from "../core/element"
import {constructInterface} from "../core/interface"

// An axis is relatively general. It simply abstracts the concept of a start and end and allows a bunch of other
// baubles like ticks, labels, etc. For now we'll just do text

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

    for (const tick of ticks) {
      let position = axisDisplacement.mul((tick - startGraphX) / (endGraphX - startGraphX)).add(start)

      instructions.push({ type: "text", text: '' + tick, font: "sans-serif", fontSize: 24, align: "center", baseline: "top",
        x: position.x, y: position.y, shadowRadius: 6 })
    }
  }

  getRenderingInstructions() {
    return this.internal.instructions
  }
}
