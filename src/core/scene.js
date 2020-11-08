import { Group } from './group.js'

export class Scene extends Group {
  constructor (params = {}) {
    super(params)

    // A scene is its own scene
    this.scene = this
  }

  getTagName () {
    return 'scene'
  }

  isScene () {
    return true
  }
}
