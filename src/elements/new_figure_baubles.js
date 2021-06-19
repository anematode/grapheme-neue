import {Group} from "../core/group.js"
import {constructInterface} from "../core/interface.js"
import {Pen} from "../styles/definitions.js"
import {generateRectangleCycle} from "../algorithm/misc_geometry.js"
import {get2DDemarcations} from "../algorithm/tick_allocator.js"

const DefaultOutlinePen = Pen.create({ endcap: "square" })

const figureBaublesInterface = constructInterface({
  interface: {
    showOutline: { typecheck: "boolean", description: "Whether to show an outline of the figure" },
    outlinePen: { setAs: "user", description: "The pen used to draw the outline" }
  }, internal: {
    // Whether to show a bounding outline of the figure
    showOutline: { type: "boolean", computed: "default", default: true },

    // Pen to use for the bounding outline
    outlinePen: { type: "Pen", computed: "user", default: DefaultOutlinePen, compose: true },

    // Internal variable of the form { major: { x: [ ... ], y: [ ... ] }, minor: ... } expressed in graph coordinates
    ticks: { computed: "none" },

    // Dictionary of pens
    gridlinePens: { type: "Pens", computed: "user", compose: true }

    // Used to calculate where the ticks are located
    //tickAllocator: { computed: "default", default: () => new Linear2DTickAllocator(), evaluateDefault: true }
  }
})

export class FigureBaubles extends Group {
  getInterface () {
    return figureBaublesInterface
  }

  _update () {
    this.defaultInheritProps()
    this.defaultComputeProps()
    this.computeTicks()

    this.computeGridlines()
    this.toggleOutline()
    this.computeRenderInfo()
  }

  computeTicks () {
    if (this.props.hasChanged("plotTransform")) {
      let tr = this.props.get("plotTransform")
      let ticks = get2DDemarcations(tr.gx1, tr.gx1 + tr.gw, tr.pw, tr.gy1, tr.gy1 + tr.gh, tr.ph)

      this.props.set("ticks", ticks)
    }
  }

  computeGridlines () {
    if (this.props.hasChanged("ticks")) {
      let ticks = this.props.get("ticks")

      console.log(ticks)
    }
  }

  toggleOutline () {
    let { showOutline, plotTransform, outlinePen: pen } = this.props.proxy

    if (showOutline && plotTransform) {
      // We inset the box by the thickness of the line so that it doesn't jut out
      let box = plotTransform.pixelBox().squish(pen.thickness / 2)
      let vertices = generateRectangleCycle(box)

      this.internal.outlineInstruction = { type: "polyline", vertices, pen }
    } else {
      this.internal.outlineInstruction = null
    }
  }

  computeRenderInfo () {
    this.internal.renderInfo = { instructions: [ this.internal.outlineInstruction ] }
  }
}
