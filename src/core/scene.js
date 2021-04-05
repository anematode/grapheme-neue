import { Group } from "./group"

// The top level element

class Scene extends Group {
  constructor (params={}) {
    super(params)
  }

  isScene () {
    return true
  }
}
