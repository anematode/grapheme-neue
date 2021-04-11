import { Group } from "./group"

// The top level element

export class Scene extends Group {
  constructor (params={}) {
    super(params)

    // Scene is its own scene
    this.scene = this
  }

  isScene () {
    return true
  }
}
