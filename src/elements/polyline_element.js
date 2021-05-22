import {Element} from "../core/element"
import {constructInterface} from "../core/interface"
import {DefaultStyles, Pen} from "../styles/definitions"

const polylineInterface = constructInterface({
  pen: { as: "user" },
  vertices: true
})

export class PolylineElement extends Element {
  init (params) {

  }

  getInterface () {
    return polylineInterface
  }

  _update () {
    let pen = this.props.getPropertyStore("pen")

    this.props.set("pen", Pen.compose(DefaultStyles.Pen, pen.userValue))
  }

  getRenderingInstructions () {
    let { vertices, pen } = this.props.proxy

    if (!vertices) return

    return { type: "polyline", vertices, pen }
  }
}
