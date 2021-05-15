import {GridlineAllocators} from "../algorithm/tick_allocator"
import {GridlinesElement} from "./gridlines"
import {Group} from "../core/group"
import {PlotBoxOutline} from "./plot_box_outline"
import {AxisElement} from "./axis"
import {Vec2} from "../math/vec/vec2"
import {constructInterface} from "../core/interface"

// Somewhat temporary class for the combination of axes, axis labels, and gridlines, in all their various modes. This
// will be a good test of the "child definition" side of Grapheme that I've been dreading. A lot of properties, several
// children, pain. I'm not sure exactly how this will work... Which is why it's a good test!

const baublesInterface = constructInterface({
  gridlines: true,
  gridlinesAllocator: true,
  plotBoxOutline: true
})

export class PlotBaubles extends Group {
  init (params) {
    this.props.setProperties({
      gridlines: true,
      gridlinesAllocator: GridlineAllocators.Standard,
      plotBoxOutline: true
    })
  }

  _set (propName, value) {

  }

  computeProps () {
    const { props } = this

    this.defaultInheritProps()

    // We first compute the x and y ticks along each axis. We represent it like so:
    // { x: { major: [ -1, -0.8, -0.6, ... ], minor: [ ... ], y: { ... } }.
    // Notably, the coordinates are in graph space, not pixel space.

    const { gridlinesAllocator, plotTransform, gridlines: showGridlines } = this.props.proxy

    const { px1, px2, py1, py2, gx1, gx2, gy1, gy2, pw, ph } = plotTransform
    const ticks = gridlinesAllocator(gx1, gx2, pw, gy1, gy2, ph)

    // Returns an object is an object of the form
    // { x: { major: [ 0.2, 0.4 ] , minor: [...] }, y: { ... }}. In general this is how we will represent ticks and
    // gridlines -- splitting into direction, then type, then position. The convention is that an "x" gridline is
    // parallel to the x axis

    props.set("ticks", ticks)

    // Generate the gridlines
    const gridlinesElement = this.createGridlinesElement()
    gridlinesElement.props.setProperties({ ticks, plotTransform })

    let start = new Vec2(px1, py1), end = new Vec2(px2, py1), startGraphX = gx1, endGraphX = gx2

    // Generate the text. Simple for now, so that we can get to making writing elements less excruciating
    const axis = this.createAxisElement()
    axis.props.setProperties({ start, end, startGraphX, endGraphX, ticks: ticks.x.major})

    window.axis = axis
  }

  createGridlinesElement () {
    const { internal } = this

    if (!internal.gridlines) {
      this.add(internal.gridlines = new GridlinesElement())
    }

    return internal.gridlines
  }

  createAxisElement () {
    const { internal } = this

    if (!internal.axis) {
      this.add(internal.axis = new AxisElement())
    }

    return internal.axis
  }

  createPlotBoxOutlineElement () {
    const { internal } = this

    if (!internal.plotBoxOutline) {
      this.add(internal.plotBoxOutline = new PlotBoxOutline())
    }

    return internal.plotBoxOutline
  }

  _update () {
    this.computeProps()

    this.createPlotBoxOutlineElement()
  }
}
