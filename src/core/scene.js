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

/**
 * Simple class that all elements receive as part of their inherited properties (unless they don't use the default
 * inheritance method).
 */
class SceneDimensions {
  constructor (width, height, dpr) {
    this.width = width
    this.height = height
    this.dpr = dpr

    // The size of the canvas in true device pixels, rather than CSS pixels
    this.canvasWidth = this.dpr * this.width
    this.canvasHeight = this.dpr * this.height
  }

  /**
   * Get the bounding box of the entire scene.
   * @returns {BoundingBox}
   */
  getBoundingBox () {
    return new BoundingBox(0, 0, this.width, this.height)
  }
}

/**
 * Top level element in a Grapheme context. The scene has a width, height, and device pixel ratio as its defining
 * geometric patterns, and potentially other properties -- interactivity information, for example. Uniquely, every
 * element knows its scene directly as its .scene property.
 */
export class Scene extends Group {
  constructor (params={}) {
    super(params)

    // Scene is its own scene
    this.scene = this

    // This call bypasses the "user" set() function, directly modifying props
    this.props.setMultipleProperties({ width: 640, height: 480, dpr: 1 })
    this.calculateSceneDimensions()
  }

  /**
   * Custom function that allows us to specify the behavior when a programmer sets a property. In this case, there are
   * three properties, namely width, height, and dpr, and they correspond directly with underlying properties, so the
   * function is rather simple. In the future, a sort of "interface" may be used which will abstract this kind of stuff
   * away. Anyway, the user sets "width" to 1000, and the internal property "width" is set to 1000.
   * @param propName
   * @param value
   * @private
   */
  _set (propName, value) {
    switch (propName) {
      case "width": case "height": case "dpr":
        this.props.setPropertyValue(propName, value)
    }
  }

  /**
   * This function operates on the properties and updates (or creates) a new, inheritable property called sceneDimensions,
   * which contains the canvas size and the device pixel ratio. All elements will receive this information, if they
   * want it. Note that the function is pretty verbose.
   */
  calculateSceneDimensions () {
    const { props } = this

    // If the programmer is tired of requesting parameters in a long form, the following syntax may be used.
    const { width, height, dpr } = props.proxy
    const sceneDimensions = new SceneDimensions(width, height, dpr)

    // Calculate scene dimensions and perform a deep equality check so that recomputations are not necessary
    props.setPropertyValue("sceneDimensions", sceneDimensions, 2)
    props.setPropertyInheritance("sceneDimensions", 1)
  }

  /**
   * In this case, the getter is very simple. There could also be a case for, say, "canvasWidth", which would grab it
   * or calculate it as appropriate.
   * @param propName {string}
   * @returns {*}
   */
  get (propName) {
    return this.props.getPropertyValue(propName)
  }

  isScene () {
    return true
  }

  /**
   * Example of a function that acts as the user, setting the size of the scene.
   * @param width
   * @param height
   */
  setSize (width, height) {
    this.set({ width, height })
  }

  _update () {
    this.calculateSceneDimensions()
  }

  updateAll () {
    this.apply(child => child.update())

    this.apply(child => child.props.markUpdated())
  }
}

_attachConvenienceGettersToElement(Scene.prototype, sceneInterface)
