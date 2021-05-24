import {Element} from "../core/element"
import {constructInterface} from "../core/interface"
import {DefaultStyles, Pen} from "../styles/definitions"

const polylineInterface = constructInterface({
  pen: { setAs: "user", setMerge: true, getAs: "real" },
  vertices: true
})

export class PolylineElement extends Element {
  _update () {
    const { props } = this

    if (props.hasChanged("pen")) {
      let pen = Pen.compose(DefaultStyles.Pen, props.getUserValue("pen"))

      props.set("pen", pen)
    }
  }

  getInterface () {
    return polylineInterface
  }

  getRenderingInstructions () {
    let { vertices, pen } = this.props.proxy
    if (!vertices || !pen) return

    return { type: "polyline", vertices, pen }
  }
}
