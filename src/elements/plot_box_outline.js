import {Element} from "../core/element.js"
import {generateRectangleCycle} from "../algorithm/misc_geometry.js"


export class PlotBoxOutline extends Element {
  constructor (params={}) {
    super(params)
  }

  _update () {
    const plottingBox = this.parent.props.get("plotTransform").pixelCoordinatesBox()

    this.internal.instructions = plottingBox ? {
      type: "polyline", vertices: generateRectangleCycle(plottingBox),
      pen: { thickness: 5, join: 'miter', endcap: 'square' }
    } : null
  }

  getRenderingInfo () {
    return this.internal.instructions
  }
}
