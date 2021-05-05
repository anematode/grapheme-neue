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

/**
 * Top level element in a Grapheme context. The scene has a width, height, and device pixel ratio as its defining
 * geometric patterns.
 */
export class Scene extends Group {
  constructor (params={}) {
    super(params)

    // Scene is its own scene
    this.scene = this
  }

  isScene () {
    return true
  }

  set (propName, value) {
    switch (propName) {

    }
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
