


import {Element} from "../core/element"
import {DefaultStyles} from "../styles/default"
import {GridlineAllocators} from "../algorithm/tick_allocator"
import {GridlinesElement} from "./gridlines"
import {Group} from "../core/group"

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
      gridlinesAllocator: GridlineAllocators.Standard
    })
  }

  _set (propName, value) {

  }

  computeProps () {
    const { props } = this

    this.defaultInheritProps()
  }

  createGridlinesElement () {
    const { internal } = this

    if (!internal.gridlines) {
      this.add(internal.gridlines = new GridlinesElement())
    }

    return internal.gridlines
  }

  _updateGridlines () {
    const { plotTransform, gridlines, gridlinesAllocator } = this.props.proxy

    if (!gridlines) {
      const gridlines = this.internal.gridlines
      if (gridlines) gridlines.visible = false

      return
    }

    const { gx1, gw, gy1, gh, pw, ph } = plotTransform
    const generatedGridlines = gridlinesAllocator(gx1, gx1 + gw, pw, gy1, gy1 + gh, ph)

    const gridlinePositions = {
      axis: {x: [] /* To be clear, these are parallel to the x-axis */, y: []},
      major: {x: [], y: []},
      minor: {x: [], y: []}
    }

    for (const gridline of generatedGridlines) {
      const group = gridlinePositions[gridline.type]
      let pixelPosition = gridline.dir === 'x' ? plotTransform.graphToPixelY(gridline.pos) : plotTransform.graphToPixelX(gridline.pos)

      group[gridline.dir].push(pixelPosition)
    }

    const gridlinesElement = this.createGridlinesElement()

    console.log(gridlinePositions)

    gridlinesElement.set({ gridlinePositions })
    gridlinesElement.visible = true
  }

  _update () {
    this.computeProps()
    this._updateGridlines()
  }
}
