import {Element} from "../core/element.js"
import {generateRectangleCycle} from "../algorithm/misc_geometry.js"
import {Pen} from "../styles/definitions.js"


export class PlotBoxOutline extends Element {
  constructor (params={}) {
    super(params)
  }

  _update () {
    const plottingBox = this.parent.props.get("plotTransform").pixelBox()

    this.internal.renderInfo = plottingBox ? {
      instructions: {
        type: "polyline", vertices: generateRectangleCycle(plottingBox),
        pen: Pen.create({thickness: 5, join: 'miter', endcap: 'square'})
      }
    } : null
  }
}
