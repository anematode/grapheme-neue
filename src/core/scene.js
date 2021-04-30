import { Group } from "./group"
import {_forwardPropsByNameDict} from "./props"
import {_attachConvenienceGettersToElement} from "./prop_enforcer"
import {BoundingBox} from "../math/bounding_box"

// The top level element

const sceneParameters = {
  "dpr" : {
    description: "The device pixel ratio.",
    default: 1,
    validate: th => (typeof th === "number") && Math.abs(th) < 50,
  },
  "width": {
    description: "The width of the plot in CSS pixels.",
    validate: w => (typeof w === "number") && Number.isInteger(w) && w >= 100 && w <= 16384,
    default: 640,
  },
  "height": {
    description: "The width of the plot in CSS pixels.",
    validate: w => (typeof w === "number") && Number.isInteger(w) && w >= 100 && w <= 16384,
    default: 480,
  }
}

const MIN_SCENE_SIZE = [100, 100]
const DEFAULT_SCENE_SIZE = [640, 480]

class SceneDimensions {
  constructor (width, height, dpr) {
    this.width = width
    this.height = height
    this.dpr = dpr

    this.canvasWidth = this.dpr * this.width
    this.canvasHeight = this.dpr * this.height
  }

  getBoundingBox () {
    return new BoundingBox(0, 0, this.width, this.height)
  }
}

export class Scene extends Group {
  constructor (params={}) {
    super(params)

    // Scene is its own scene
    this.scene = this

    this.set({ width: 640, height: 480 })
  }

  isScene () {
    return true
  }

  update (updateParams) {
    if (this.updateStage === -1) return

    const { props, computedProps } = this

    // A bit overcomplicated, just to get the ideas down

    // "Dependencies" of a sort. -2 is basically a version of "recalculate everything", in which case we compute it too
    if (this.updateStage === -2 || props.hasChanged(["width", "height", "dpr"])) {
      let width = props.get("width") ?? 640
      let height = props.get("height") ?? 480
      let dpr = props.get("dpr") ?? 1

      computedProps.set("sceneDimensions", new SceneDimensions(width, height, dpr), { inherit: 1 })

      // If an inherited prop has changed, all children need to be recomputed. This will recurse downwards
      this.children.forEach(child => child.updateStage = 0)
    }

    this.updateStage = -1
  }

  updateAll () {
    this.apply(child => {
      if (child.updateStage !== -1)
        child.update()
    })
  }

  getInheritableProps () {

  }
}

_attachConvenienceGettersToElement(Scene.prototype, sceneParameters)
