import {Element} from "../core/element"


export class AxisElement extends Element {
  constructor (params) {
    super (params)

    // For now, just add some labels
  }

  _update () {
    const { ticks, start, end, startGraphX, endGraphX } = this.props.proxy

    let instructions = this.internal.instructions = []
    let axisDisplacement = end.sub(start)

    for (const tick of ticks) {
      let position = axisDisplacement.mul((tick - startGraphX) / (endGraphX - startGraphX)).add(start)

      instructions.push({ type: "text", text: '' + tick, font: "50px Cambria", align: "center", baseline: "bottom",
        x: position.x, y: position.y })
    }
  }
}
