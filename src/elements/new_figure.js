import {Element} from "../core/element.js"
import {constructInterface} from "../core/interface.js"
import {LinearPlot2DTransform, LinearPlot2DTransformConstraints} from "../math/plot_transforms.js"

const defaultView = [ -1, -1, 2, 2 ]

const figureInterface = constructInterface({
  interface: {},
  internal: {
    // Scene dims (inherited from above)
    "sceneDims": { computed: "none" },

    // Bounding box of the entire figure
    "figureBoundingBox": {computed: "none"},

    // Box in which things are actually plotted
    "plottingBox": {computed: "none"},

    // Margin between the plotting box and figure bounding box
    "margins": {computed: "default", default: {left: 0, right: 0, top: 0, bottom: 0}},

    // Transformation from pixel to graph coordinates and vice versa
    "plotTransform": {computed: "default", default: () => new LinearPlot2DTransform(0, 0, 0, 0, ...defaultView), evaluateDefault: true },

    // Whether to force the plot transform to have a specific aspect ratio
    "preserveAspectRatio": { computed: "default", default: true },

    // The aspect ratio to force
    "forceAspectRatio": { computed: "default", default: true },

    // Interactivity
    "interactivity": { computed: "default", default: true },

    // Constraints on where the transform can be (min zoom, max zoom, etc.)
    "transformConstraints": { computed: "default", default: () => new LinearPlot2DTransformConstraints(), evaluateDefault: true }
  }
})

export class NewFigure extends Element {
  _update () {
    this.defaultInheritProps()
    this.defaultComputeProps()
  }

  computeBoxes () {
    const { props } = this

    props.set("figureBoundingBox", props.get("sceneDims").getBoundingBox())

    let margins = props.get("margins")
    props.set("plottingBox", props.get("figureBoundingBox")
      .squishAsymmetrically(margins.left, margins.right, margins.bottom, margins.top))
  }

  computePlotTransform () {
    // We compute the plot transform from its current value, the plotting box, and related values which constrain the
    // plot transform (minZoom, maxZoom, preserveAspectRatio)


  }

  getInterface() {
    return figureInterface
  }

  getRenderingInfo () {
    return { instructions: { type: "debug", rect: {cx: 500, cy: 500, w: 100, h: 100} }}
  }
}
