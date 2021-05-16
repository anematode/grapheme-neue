import { Color } from './color'

let DefaultPen

class Pen {
  constructor (params = {}) {
    const {
      color = new Color(),
      thickness = 2, // in CSS pixels
      dashPattern = [], // lengths of alternating dashes
      dashOffset = 0, // length of dash offset
      endcap = 'round', // endcap, among "butt", "round", "square"
      endcapRes = 1, // angle between consecutive endcap roundings, only used in WebGL
      join = 'miter', // join type, among "miter", "round", "bevel"
      joinRes = 1, // angle between consecutive join roundings
      useNative = false, // whether to use native line drawing, only used in WebGL
      visible = true
    } = params

    this.color = color
    this.thickness = thickness
    this.dashPattern = dashPattern
    this.dashOffset = dashOffset
    this.endcap = endcap
    this.endcapRes = endcapRes
    this.join = join
    this.joinRes = joinRes
    this.useNative = useNative
    this.visible = visible
  }

  clone() {
    let copy = new Pen(this)
    copy.color = this.color.clone()
  }

  toJSON () {
    return {
      color: this.color.toJSON(),
      thickness: this.thickness,
      dashPattern: this.dashPattern.slice(),
      dashOffset: this.dashOffset,
      endcap: this.endcap,
      endcapRes: this.endcapRes,
      join: this.join,
      joinRes: this.joinRes,
      useNative: this.useNative,
      visible: this.visible
    }
  }

  static fromObj (strOrObj) {
    if (typeof strOrObj === "string") return _interpretStringAsPen(strOrObj)

    return new Pen(strOrObj)
  }

  static DefaultPen = DefaultPen
}

DefaultPen = Object.freeze(new Pen())

// Fun Asymptote Vector Graphics–like thing :) We break up str into tokens which each have some meaning TODO
function _interpretStringAsPen (str) {
  try {
    let color = Color.fromCss(str)

    return new Pen({ color })
  } catch {
    return new Pen()
  }
}



export { Pen }
