import {Group} from "../core/group.js"
import {constructInterface} from "../core/interface.js"
import {DefaultStyles, Pen} from "../styles/definitions.js"
import {generateRectangleCycle} from "../algorithm/misc_geometry.js"
import {get2DDemarcations} from "../algorithm/tick_allocator.js"

const DefaultOutlinePen = Pen.create({ endcap: "square" })
const DefaultGridlinePens = { major: DefaultStyles.gridlinesMajor, minor: DefaultStyles.gridlinesMinor, axis: DefaultStyles.gridlinesAxis }

const figureBaublesInterface = constructInterface({
  interface: {
    showOutline: { typecheck: "boolean", description: "Whether to show an outline of the figure" },
    showGridlines: { typecheck: "boolean", description: "Whether to show gridlines" },
    sharpenGridlines: { typecheck: "boolean", description: "Whether to make the gridlines look sharp by aligning them to pixel boundaries" },
    outlinePen: { setAs: "user", description: "The pen used to draw the outline" }
  }, internal: {
    // Whether to show a bounding outline of the figure
    showOutline: { type: "boolean", computed: "default", default: true },

    // Whether to show the figure's gridlines
    showGridlines: { type: "boolean", computed: "default", default: true },

    // Whether to sharpen the gridlines
    sharpenridlines: { type: "boolean", computed: "default", default: true },

    // Pen to use for the bounding outline
    outlinePen: { type: "Pen", computed: "user", default: DefaultOutlinePen, compose: true },

    // Internal variable of the form { major: { x: [ ... ], y: [ ... ] }, minor: ... } expressed in graph coordinates
    ticks: { computed: "none" },

    // Dictionary of pens
    gridlinePens: { type: "Pens", computed: "user", default: DefaultGridlinePens, compose: true }

    // Used to calculate where the ticks are located
    //tickAllocator: { computed: "default", default: () => new Linear2DTickAllocator(), evaluateDefault: true }
  }
})

/**
 * Given a plot transform, ticks and set of pens, generate a set of polyline calls that draw gridlines.
 * @param plotTransform {LinearPlot2DTransform}
 * @param ticks
 * @param gridlinePens
 * @returns {Array}
 */
function generateGridlinesInstructions (plotTransform, ticks, gridlinePens, sharpen=true) {
  let pixelBox = plotTransform.pixelBox()
  let instructions = []

  for (let [ style, entries ] of Object.entries(ticks)) {
    let pen = gridlinePens[style]
    let thickness = pen.thickness

    // Used to make thin lines appear "sharper"
    let shift = ((thickness % 2) === 1) ? 0.5 : 0

    if (!pen) continue

    let vertices = []

    for (let tick of entries.x) {
      let x = plotTransform.graphToPixelX(tick)
      if (sharpen) {
        x = (x | 0) + shift
      }

      vertices.push(x, pixelBox.y, x, pixelBox.y2)
      vertices.push(NaN, NaN)
    }

    for (let tick of entries.y) {
      let y = (plotTransform.graphToPixelY(tick) | 0) + shift
      if (sharpen) {
        y = (y | 0) + shift
      }

      vertices.push(pixelBox.x, y, pixelBox.x2, y)
      vertices.push(NaN, NaN)
    }

    instructions.push({ type: "polyline", vertices: new Float32Array(vertices), pen })
  }


  return instructions
}

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
    if (this.props.haveChanged(["ticks", "showGridlines", "sharpenGridlines"])) {
      let { showGridlines, ticks, gridlinePens, plotTransform, sharpenGridlines } = this.props.proxy

      this.internal.gridlinesInstructions = showGridlines ? generateGridlinesInstructions(plotTransform, ticks, gridlinePens, sharpenGridlines) : []
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
    this.internal.renderInfo = { instructions: [ this.internal.outlineInstruction, ...this.internal.gridlinesInstructions ] }
  }
}
