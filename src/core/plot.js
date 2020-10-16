import {Group} from "./group.js"

// Abstract class for Plot2D and (eventually) Plot3D
export class Plot extends Group {
  constructor (params={}) {
    super(params)

    this._setPlot(this)
  }
}
