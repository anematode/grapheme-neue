import {Group} from "../core/group"
import {BoundingBox} from "../math/bounding_box"

/**
 * Represents a linear transformation by storing two bounding boxes: one for the plot in CSS pixels, and one for the
 * actual elements in the graph. Some parts of this should be highly optimized, but it needn't be complicated.
 */
class Plot2DTransform {
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
      boundingBox: new BoundingBox(0, 0, 100, 100),
      plottingBox: new BoundingBox(0, 0, 640, 480),
      marginLeft: 0,
      marginRight: 0,
      marginBottom: 0,
      marginTop: 0
    }).configureProperties(["boundingBox", "plottingBox"], {
      inherit: true
    })
  }

  _set (propName, value) {
    switch (propName) {
      case "marginLeft":
      case "marginRight":
      case "marginBottom":
      case "marginTop":
        this.props.setPropertyValue(propName, value)
        break
      case "margin":
        this.setMargins({ left: value, right: value, bottom: value, top: value })
        break
      case "margins":
        this.setMargins(value)
    }
  }

  get (propName) {
    switch (propName) {
      case "boundingBox":
      case "plottingBox":
      case "marginLeft":
      case "marginRight":
      case "marginBottom":
      case "marginTop":
        return this.props.getPropertyValue(propName)

      case "margin":
        return this.props.getPropertyValue("marginLeft")

      case "margins":
        // Virtual property
        return this.getMargins()
    }
  }

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

  // We assume that the bounding box and margins are god, for now. In the future there might be some more clever technique here.
  updateBoxes () {

  }

  computeProps () {
    const { props } = this

    this.defaultInheritProps()

    // For now, we set the bounding box to the scene dimensions
    const boundingBox = props.setPropertyValue("boundingBox",
      props.getPropertyValue("sceneDimensions").getBoundingBox(), 2)

    // Calculate the plotting box from the margins, if changed
    if (props.havePropertiesChanged(["marginLeft", "marginRight", "marginTop", "marginBottom"])) {
      const margins = this.getMargins()

      let plottingBox = boundingBox.squishAsymmetrically(margins.left, margins.right, margins.bottom, margins.top) ?? boundingBox.clone()

      props.setPropertyValue("plottingBox", plottingBox, 2)
    }
  }

  /**
   * Update the figure's parameters.
   * @param updateParams
   */
  update (updateParams) {
    // For now, we will have the overall bounding box of the figure be the size of the plot, unless it is otherwise
    // specified.

    if (this.updateStage === 100) return

    this.computeProps()

    this.updateStage = 100
  }
}
