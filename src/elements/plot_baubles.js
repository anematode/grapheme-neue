


import {Element} from "../core/element"
import {DefaultStyles} from "../styles/default"
import {GridlineAllocators} from "../algorithm/tick_allocator"
import {GridlinesElement} from "./gridlines"
import {Group} from "../core/group"
import {PlotBoxOutline} from "./plot_box_outline"

// Somewhat temporary class for the combination of axes, axis labels, and gridlines, in all their various modes. This
// will be a good test of the "child definition" side of Grapheme that I've been dreading. A lot of properties, several
// children, pain. I'm not sure exactly how this will work... Which is why it's a good test!

// For now, we'll have:

// gridlineAllocator: calculates where gridlines and ticks of various types should actually go.
//
//
// inherits: plottingBox (is what's relevant)

// It has a child: GridlinesElement

export class PlotBaubles extends Group {
  constructor (params) {
    super(params)

    this.props.setMultipleProperties({
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

    const { gx1, gx2, gy1, gy2, pw, ph } = plotTransform
    const ticks = gridlinesAllocator(gx1, gx2, pw, gy1, gy2, ph)

    // Returns an object is an object of the form
    // { x: { major: [ 0.2, 0.4 ] , minor: [...] }, y: { ... }}. In general this is how we will represent ticks and
    // gridlines -- splitting into direction, then type, then position. The convention is that an "x" gridline is
    // parallel to the x axis

    props.setPropertyValue("ticks", ticks)

    // Generate the gridlines
    const gridlinesElement = this.createGridlinesElement()
    gridlinesElement.props.setPropertyValues({ ticks, plotTransform })


  }

  createGridlinesElement () {
    const { internal } = this

    if (!internal.gridlines) {
      this.add(internal.gridlines = new GridlinesElement())
    }

    return internal.gridlines
  }

  createPlotBoxOutlineElement () {
    const { internal } = this

    if (!internal.plotBoxOutline) {
      this.add(internal.plotBoxOutline = new PlotBoxOutline())
    }

    return internal.plotBoxOutline
  }

  _updateGridlines () {

  }

  _update () {
    this.computeProps()
    this._updateGridlines()
    this.createPlotBoxOutlineElement()
  }
}
