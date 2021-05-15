import {Group} from "../core/group"
import {BoundingBox} from "../math/bounding_box"
import {PlotBaubles} from "./plot_baubles"
import {Vec2} from "../math/vec/vec2"
import { LinearPlot2DTransform } from "../math/plot_transforms"
import {constructInterface} from "../core/interface"

const figureInterface = constructInterface({
  figureBoundingBox: true,
  plottingBox: true,
  plotTransform: true,
  marginLeft: true, marginRight: true, marginTop: true, marginBottom: true,
  margins: { destructuring: { left: "marginLeft", right: "marginRight", bottom: "marginBottom", top: "marginTop"} },
  margin: { get: "marginLeft", set: [ "marginLeft", "marginRight", "marginBottom", "marginTop" ] }
})

export class Figure extends Group {
  constructor (params) {
    super(params)

    // TODO make more elegant
    this.props.setMultipleProperties({
      figureBoundingBox: new BoundingBox(0, 0, 100, 100),
      plottingBox: new BoundingBox(0, 0, 640, 480),
      plotTransform: new LinearPlot2DTransform(0, 0, 640, 480, -1, -1, 4, 2)
    }).configureProperties(["figureBoundingBox", "plotTransform"], {
      inherit: true
    })

    this.set({ margin: 0 })
    this.enableInteractivity()
  }

  getInterface () {
    return figureInterface
  }

  enableInteractivity () {
    const { internal, props } = this

    const listeners = internal.interactivityListeners = {}
    let mouseDownAt, graphMouseDownAt, isMouseDown

    this.addEventListener("mousedown", listeners.mousedown = ({ x, y }) => {
      mouseDownAt = new Vec2(x, y)
      graphMouseDownAt = props.getPropertyValue("plotTransform").pixelToGraph(mouseDownAt)
      isMouseDown = true
    })

    this.addEventListener("mouseup", listeners.mousedown = ({ x, y }) => {
      isMouseDown = false
    })

    this.addEventListener("mousemove", listeners.mousemove = ({ x, y }) => {
      if (!isMouseDown) return

      let transform = props.getPropertyValue("plotTransform")

      // Get where the mouse is currently at and move (graphMouseDownAt) to (mouseDownAt)
      let graphMouseMoveAt = transform.pixelToGraph({ x, y })

      let translationNeeded = graphMouseDownAt.sub(graphMouseMoveAt)

      transform.gx1 += translationNeeded.x
      transform.gy1 += translationNeeded.y

      props.markChanged("plotTransform")
    })

  }

  /**
   * Compute figureBoundingBox and plottingBox
   */
  updateBoxes () {
    const { props } = this

    const boundingBox = props.setPropertyValue("figureBoundingBox",
      props.getPropertyValue("sceneDimensions").getBoundingBox(), 2)

    if (props.havePropertiesChanged(["marginLeft", "marginRight", "marginTop", "marginBottom", "figureBoundingBox"])) {
      const margins = this.get("margins")

      let plottingBox = boundingBox.squishAsymmetrically(margins.left, margins.right, margins.bottom, margins.top) ?? boundingBox.clone()

      props.setPropertyValue("plottingBox", plottingBox, 2)
    }
  }

  /**
   * Compute plotTransform
   */
  updatePlotTransform () {
    const { props } = this

    const { plotTransform, plottingBox } = props.proxy
    const newTransform = plotTransform.clone().resizeToPixelBox(plottingBox)

    props.setPropertyValue("plotTransform", newTransform, 2)
  }

  _update () {
    this.defaultInheritProps()

    this.updateBoxes()
    this.updatePlotTransform()
  }
}
