import {Element} from "../core/element"
import {constructInterface} from "../core/interface"
import {DefaultStyles, Pen} from "../styles/definitions"

const polylineInterface = constructInterface({
  pen: true,
  vertices: true
})

export class PolylineElement extends Element {
  init (params) {

  }

  getInterface () {
    return polylineInterface
  }

  _update () {

  }

  getRenderingInstructions () {
    let { vertices, pen } = this.props.proxy

    if (!vertices) return
    pen = Pen.compose(DefaultStyles.Pen, pen)

    return { type: "polyline", vertices, pen }
  }
}
