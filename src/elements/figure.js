import {Group} from "../core/group.js"
import {BoundingBox} from "../math/bounding_box.js"
import {PlotBaubles} from "./plot_baubles.js"
import {Vec2} from "../math/vec/vec2.js"
import { LinearPlot2DTransform } from "../math/plot_transforms.js"
import {constructInterface} from "../core/interface.js"

const figureInterface = constructInterface({
  figureBoundingBox: true,
  plottingBox: true,
  plotTransform: true,
  marginLeft: true, marginRight: true, marginTop: true, marginBottom: true,
  margins: { destructuring: { left: "marginLeft", right: "marginRight", bottom: "marginBottom", top: "marginTop"} },
  margin: { get: "marginLeft", set: [ "marginLeft", "marginRight", "marginBottom", "marginTop" ] },
  interactivity: { onSet: function (v) { this._interactivityEnabled(v) } },
  clipPlottingBox: true
})

let defaults = {
  figureBoundingBox: new BoundingBox(0, 0, 100, 100),
  plottingBox: new BoundingBox(0, 0, 640, 480),
  plotTransform: new LinearPlot2DTransform(0, 0, 640, 480, -1, -1, 4, 2),
  margin: 0,
  interactivity: true,
  clipPlottingBox: true
}

export class Figure extends Group {
  init () {
    this.props.configureProperties(["figureBoundingBox", "plotTransform"], {
      inherit: true
    })
  }

  getInterface () {
    return figureInterface
  }

  /**
   * Enable or disable interactivity listeners
   * @param enable
   * @private
   */
  _interactivityEnabled (enable) {
    if (enable) {
      // Example of how internals will generally work. We don't use local variables, preferring to manipulate internal
      // directly, so that the state is accessible from outside
      const {internal: int, props} = this

      const listeners = int.interactivityListeners = {}

      // Mouse dragging handlers
      this.addEventListener("mousedown", listeners.mousedown = ({x, y}) => {
        int.mouseDownAt = new Vec2(x, y)
        int.graphMouseDownAt = props.get("plotTransform").pixelToGraph(int.mouseDownAt) // try to keep this constant

        int.isDragging = true
      })

      this.addEventListener("mouseup", listeners.mousedown = () => {
        int.isDragging = false
      })

      this.addEventListener("mousemove", listeners.mousemove = ({x, y}) => {
        if (!int.isDragging) return
        let transform = props.get("plotTransform")

        // Get where the mouse is currently at and move (graphMouseDownAt) to (mouseDownAt)
        let graphMouseMoveAt = transform.pixelToGraph({x, y})
        let translationNeeded = int.graphMouseDownAt.sub(graphMouseMoveAt)

        transform.gx1 += translationNeeded.x
        transform.gy1 += translationNeeded.y

        // Directly modified the transform object, so we have to mark it as changed. Could also clone and set it
        props.markChanged("plotTransform")
      })

      // Scroll handler
      this.addEventListener("wheel", listeners.wheel = ({x, y, deltaY}) => {
        let transform = props.get("plotTransform")
        let graphScrollAt = transform.pixelToGraph({x, y})
        let scaleFactor = 1 + deltaY / 300

        let graphBox = transform.graphCoordinatesBox()

        // We need to scale graphBox at graphScrollAt with a scale factor. We translate it by -graphScrollAt, scale it by
        // sF, then translate it by graphScrollAt
        graphBox = graphBox.translate(graphScrollAt.mul(-1)).scale(scaleFactor).translate(graphScrollAt)

        transform.resizeToGraphBox(graphBox)
        props.markChanged("plotTransform")
      })
    } else {
      const {internal} = this

      const listeners = internal.interactivityListeners
      for (const [listenerName, listener] of Object.entries(listeners)) {
        this.removeEventListener(listenerName, listener)
      }

      this.internal.interactivityListeners = null
    }
  }

  /**
   * Compute figureBoundingBox and plottingBox
   */
  updateBoxes () {
    const { props } = this

    if (props.haveChanged(["sceneDims", "marginLeft", "marginRight",  "marginTop", "marginBottom", "figureBoundingBox"])) {
      const boundingBox = props.set("figureBoundingBox", props.get("sceneDims").getBoundingBox(), 2)
      const margins = this.get("margins")

      let plottingBox = boundingBox.squishAsymmetrically(margins.left, margins.right, margins.bottom, margins.top) ?? boundingBox.clone()

      props.set("plottingBox", plottingBox, 2)
    }
  }

  /**
   * Compute plotTransform
   */
  updatePlotTransform () {
    const { props } = this

    if (props.haveChanged([ "plotTransform", "plottingBox" ])) {
      const { plotTransform, plottingBox } = props.proxy
      const newTransform = plotTransform.clone().resizeToPixelBox(plottingBox)

      props.set("plotTransform", newTransform, 2)
    }
  }

  updateProps() {
    this.defaultInheritProps()

    this.forwardDefaults(defaults)
    this.updateBoxes()
    this.updatePlotTransform()

    let clipPlottingBox = this.get("clipPlottingBox")
    if (clipPlottingBox) {
      let plottingBox = this.get("plottingBox")

      this.internal.renderInfo = { contexts: { scissor: plottingBox } }
    } else {
      this.internal.renderInfo = null
    }
  }

  _update () {
    this.updateProps()
  }
}
