import { Group } from "./group"

// The top level element

const DEFAULT_SCENE_SIZE = [640, 480]


export class Scene extends Group {
  constructor (params={}) {
    super(params)

    // Scene is its own scene
    this.scene = this

    this.setSize(...DEFAULT_SCENE_SIZE)
  }

  setSize (width, height) {
    this.set({ width, height })
  }

  get width () {
    return this.get("width")
  }

  get height () {
    return this.get("height")
  }

  setDPI (dpi) {
    this.set({ dpi })
  }

  isScene () {
    return true
  }

  update () {
    // The final system will probably be very intricate. For now, we 1. compute the parent's properties, then 2. forward
    // the inheritable attributes to the child, keeping track of their inheritability state. For starters we'll just have
    // inherit: 0 meaning no inherit and inherit: 1 meaning inherit.


  }
}
