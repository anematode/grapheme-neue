
// Principles: Some things in Grapheme have styling information that may be shared or may be composed from other bits of
// information. Tracking the "changed" values of different parts of this information is generally not useful, except in
// the case of colors on elements, but that can be dealt with via caching if REALLY needed. We basically define a shared
// common style system that allows composition of common things. We'll start with a line style.



import {Color} from "../other/color"

export const Pen = {
  // take a list of partial pen specifications and combine them into a complete pen by combining each and keeping only
  // the valid parameters TODO
  compose: (...args) => {
    let ret = {}

    for (let i = 0; i < args.length; ++i) {
      Object.assign(ret, args[i])
    }

    ret.color = Color.fromObj(ret.color)

    return ret
  },
  create: (params) => {
    return Pen.compose(Pen.default, params)
  },
  default: {
    color: { r: 0, g: 0, b: 0, a: 255},
    thickness: 2,
    dashPattern: [],
    dashOffset: 0,
    endcap: "round",
    endcapRes: 1,
    join: "miter",
    joinRes: 1,
    useNative: false,
    visible: true
  }
}

export const DefaultStyles = {
  gridlinesMajor: { thickness: 2 },
  gridlinesMinor: { thickness: 1 },
  gridlinesAxis: { thickness: 4 },
}
