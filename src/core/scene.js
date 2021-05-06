import { Group } from "./group"
import {_attachConvenienceGettersToElement} from "./prop_enforcer"
import {BoundingBox} from "../math/bounding_box"

// The top level element

const sceneInterface = {
  "dpr" : {
    description: "The device pixel ratio.",
    default: 1,
    whenSet: "dpr",
    whenGet: "dpr",
    validate: th => (typeof th === "number") && Math.abs(th) < 50,
  },
  "width": {
    description: "The width of the plot in CSS pixels.",
    default: 640,
    validate: w => (typeof w === "number") && Number.isInteger(w) && w >= 100 && w <= 16384,
    whenSet: "width",
    whenGet: "width"
  },
  "height": {
    description: "The width of the plot in CSS pixels.",
    validate: w => (typeof w === "number") && Number.isInteger(w) && w >= 100 && w <= 16384,
    default: 480,
    whenSet: "height",
    whenGet: "height"
  },
  "dimensions": {
    description: "The dimensions of the scene.",
    whenSet: null,
    whenGet: "sceneDimensions"
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

    this.props.setMultipleProperties({ width: 640, height: 480, dpr: 1 })
  }

  isScene () {
    return true
  }

  calculateSceneDimensions () {
    const { props } = this

    const { width, height, dpr } = props.proxy
    const sceneDimensions = new SceneDimensions(width, height, dpr)

    // Calculate scene dimensions and perform a deep equality check so that recomputations are not necessary
    props.setPropertyValue("sceneDimensions", sceneDimensions, 2)
    props.setPropertyInheritance("sceneDimensions", 1)
  }

  _set (propName, value) {
    switch (propName) {
      case "width":
      case "height":
      case "dpr":
        this.props.setPropertyValue(propName, value)
    }
  }

  get (propName) {
    return this.props.getPropertyValue(propName)
  }

  updateAll () {
    this.apply(child => child.update())

    this.apply(child => child.props.markUpdated())
  }

  setSize (width, height) {
    this.set({ width, height })
  }

  update () {
    if (this.updateStage === 100) return

    this.calculateSceneDimensions()
    if (this.props.hasChangedInheritableProperties)
      this.children.forEach(child => child.updateStage = 0)

    this.updateStage = 100
  }
}

_attachConvenienceGettersToElement(Scene.prototype, sceneInterface)
