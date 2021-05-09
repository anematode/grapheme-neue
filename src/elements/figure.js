import {Group} from "../core/group"
import {BoundingBox} from "../math/bounding_box"
import {PlotBaubles} from "./plot_baubles"

/**
 * Represents a linear transformation by storing two bounding boxes: one for the plot in CSS pixels, and one for the
 * actual elements in the graph. Some parts of this should be highly optimized, but it needn't be complicated.
 */
class LinearPlot2DTransform {
  /**
   * Parameters beginning with p are the bounding box in pixel coordinates. Those beginning with g are the bounding box
   * in graph coordinates. The transform has an implicit y flipping operation, which is key. The point (px1, py1) does
   * NOT map to the point (gx1, gy1), but the point (gx1, gy1 + gh). This annoyance is why a special class is useful.
   * @param px1
   * @param py1
   * @param pw
   * @param ph
   * @param gx1
   * @param gy1
   * @param gw
   * @param gh
   */
  constructor (px1, py1, pw, ph, gx1, gy1, gw, gh) {
    this.px1 = px1
    this.py1 = py1
    this.pw = pw
    this.ph = ph
    this.gx1 = gx1
    this.gy1 = gy1
    this.gw = gw
    this.gh = gh
  }

  pixelCoordinatesBox () {
    return new BoundingBox(this.px1, this.py1, this.pw, this.ph)
  }

  graphCoordinatesBox () {
    return new BoundingBox(this.gx1, this.gy1, this.gw, this.gh)
  }

  resizeToPixelBox (box) {
    this.px1 = box.x
    this.py1 = box.y
    this.pw = box.w
    this.ph = box.h

    return this
  }

  resizeToGraphBox (box) {
    this.gx1 = box.x
    this.gy1 = box.y
    this.gw = box.w
    this.gh = box.h

    return this
  }

  setGraphXBounds (x1, x2) {
    this.gx1 = x1
    this.gw = x2 - x1
  }

  setGraphYBounds (y1, y2) {
    this.gy1 = y1
    this.gh = y2 - y1
  }

  setGraphXYBounds (x1, x2, y1, y2) {
    this.setGraphXBounds(x1, x2)
    this.setGraphYBounds(y1, y2)
  }

  clone() {
    return new LinearPlot2DTransform(this.px1, this.py1, this.pw, this.ph, this.gx1, this.gy1, this.gw, this.gh)
  }

  pixelToGraphX (x) {
    // This is not flipped
    return (x - this.px1) / this.pw * this.gw + this.gx1
  }

  pixelToGraphY (y) {
    // This is flipped
    return (1 - (y - this.py1) / this.ph) * this.gh + this.gy1
  }

  graphToPixelX (x) {
    // This is not flipped
    return (x - this.gx1) / this.gw * this.pw + this.px1
  }

  graphToPixelY (y) {
    // This is flipped
    return (1 - (y - this.gy1) / this.gh) * this.ph + this.py1
  }
}

function createTransform (plotBox, graphBox) {

}

/**
 * HIGHLY WIP
 *
 * A figure is defined by an outermost bounding box, and inside, a set of various elements. Perhaps there will be diff.
 * kinds of figures, but for now, we will have an inner bounding box which represents where the actual data/graphs will
 * be drawn. Then we will have a transform between that and the graph space.
 *
 * Computed props. Names may change:
 * figureBoundingBox - BoundingBox, in CSS pixels. INHERITABLE
 * plotSpace - BoundingBox, in CSS pixels. INHERITABLE
 * plotTransform - Plot2DTransform, INHERITABLE
 *
 * Yes, this means that every child of a Figure will have those parameters. At least for now.
 *
 * Inherited props:
 * sceneDimensions - SceneDimensions
 *
 * Props:
 *
 */
export class Figure extends Group {
  constructor (params) {
    super(params)

    this.props.setMultipleProperties({
      figureBoundingBox: new BoundingBox(0, 0, 100, 100),
      plottingBox: new BoundingBox(0, 0, 640, 480),
      plotTransform: new LinearPlot2DTransform(0, 0, 640, 480, -1, -1, 2, 2)
    }).configureProperties(["figureBoundingBox", "plotTransform"], {
      inherit: true
    })

    this.set({ margin: 0 })
  }

  _set (propName, value) {
    switch (propName) {
      case "marginLeft": case "marginRight": case "marginBottom":
      case "marginTop":
        this.props.setPropertyValue(propName, value)
        break
      case "margin":
        this.setMargins({ left: value, right: value, bottom: value, top: value })
        break
      case "margins":
        this.setMargins(value)
        break
    }
  }

  get (propName) {
    switch (propName) {
      case "figureBoundingBox": case "plottingBox": case "marginLeft":
      case "marginRight": case "marginBottom": case "marginTop":
      case "plotTransform":
        return this.props.getPropertyValue(propName)

      case "margin":
        // Virtual property
        return this.props.getPropertyValue("marginLeft")

      case "margins":
        // Virtual property
        return this.getMargins()
    }
  }

  // Grotesque example of a virtual property. Could definitely be made simpler code-wise once the interface system is
  // well-defined.
  getMargins () {
    const [ left, right, bottom, top ] = this.props.getPropertyValues(["marginLeft", "marginRight", "marginBottom", "marginTop"])

    return { left, right, bottom, top }
  }

  setMargins (margins={}) {
    if ("top" in margins)
      this.set("marginTop", margins.top)
    if ("bottom" in margins)
      this.set("marginBottom", margins.bottom)
    if ("left" in margins)
      this.set("marginLeft", margins.left)
    if ("right" in margins)
      this.set("marginRight", margins.right)
  }

  // We assume that the bounding box and margins are god, for now. In the future the calculation will be far more complicated
  updateBoxes () {
    const { props } = this

    // For now, we set the bounding box to the scene dimensions
    const boundingBox = props.setPropertyValue("figureBoundingBox",
      props.getPropertyValue("sceneDimensions").getBoundingBox(), 2)

    // Calculate the plotting box from the margins, if changed
    if (props.havePropertiesChanged(["marginLeft", "marginRight", "marginTop", "marginBottom", "figureBoundingBox"])) {
      const margins = this.getMargins()

      let plottingBox = boundingBox.squishAsymmetrically(margins.left, margins.right, margins.bottom, margins.top) ?? boundingBox.clone()

      props.setPropertyValue("plottingBox", plottingBox, 2)
    }
  }

  /**
   * This function assumes that the plottingBox property is correct
   */
  updatePlotTransform () {
    const { props } = this

    const { plotTransform, plottingBox } = props.proxy
    const newTransform = plotTransform.clone().resizeToPixelBox(plottingBox)

    props.setPropertyValue("plotTransform", newTransform, 2)
  }

  setXBounds (x1, x2) {

  }

  computeProps () {
    const { props } = this

    this.defaultInheritProps()

    this.updateBoxes()
    this.updatePlotTransform()
  }

  /**
   * Update the figure's parameters.
   * @param updateParams
   */
  _update (updateParams) {
    // For now, we will have the overall bounding box of the figure be the size of the plot, unless it is otherwise
    // specified.
    super._update()

    this.computeProps()
  }
}
