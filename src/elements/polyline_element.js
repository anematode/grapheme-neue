import {Element} from "../core/element"
import {constructInterface} from "../core/interface"
import {DefaultStyles, Pen} from "../styles/definitions"

const polylineInterface = constructInterface({
  pen: { setAs: "user", getAs: "real" },
  vertices: true
})

export class PolylineElement extends Element {
  getInterface () {
    return polylineInterface
  }

  _update () {
    const { props } = this

    if (props.hasChanged("pen")) {
      let pen = Pen.compose(DefaultStyles.Pen, props.getPropertyStore("pen")?.userValue)

      props.set("pen", pen)
    }
  }

  getRenderingInstructions () {
    let { vertices, pen } = this.props.proxy
    if (!vertices || !pen) return

    return { type: "polyline", vertices, pen }
  }
}
