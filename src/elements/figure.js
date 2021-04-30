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

function createTransform (plotBox, graphBox)

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
class Figure extends Group {
  constructor (params) {
    super(params)
  }

  /**
   * Update the figure's parameters.
   * @param updateParams
   */
  update (updateParams) {
    // For now, we will have the overall bounding box of the figure be the size of the plot, unless it is otherwise
    // specified.

    if (this.updateStage === -1) return

    this._defaultInheritProps()

    /**
     * COMPUTE THE COMPUTED PROPS
     */
    const { props, computedProps } = this

    // For now, we'll set the outer bounding box to the scene, and the inner bounding box to some amount of margin in.
    // In the future there will be some better method of determining this — a dynamic one, of course.

    if (computedProps.hasChanged("sceneDimensions")) {
      const sceneDims = computedProps.get("sceneDimensions")

      const outerBox = sceneDims.getBoundingBox()
      const innerBox = outerBox.squish(50)

      if (!innerBox) // postpissedchil
        throw "not sure what to do here. throwing an error seems dumb, maybe some sort of 'abandon' functionality"

      const plotTransform

      computedProps.set("figureBoundingBox", bbox)
    }

  }
}
