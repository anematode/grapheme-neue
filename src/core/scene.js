import { Group } from "./group"
import {BoundingBox} from "../math/bounding_box"
import {attachGettersAndSetters, constructInterface} from "./interface"

// Example interface
const sceneInterface = constructInterface({
  "dpr": true,
  "width": true,
  "height": true,
  "sceneDimensions": { readOnly: true, aliases: [ "dimensions" ] }
})

/**
 * Passed to children as the parameter "sceneDimensions"
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
  init (params) {
    this.scene = this

    this.props.setPropertyValues({ width: 640, height: 480, dpr: 1 })
  }

  /**
   * Compute the internal property "sceneDimensions"
   */
  calculateSceneDimensions () {
    const { props } = this

    const { width, height, dpr } = props.proxy
    const sceneDimensions = new SceneDimensions(width, height, dpr)

    // Equality check of 2 for deep comparison, in case width, height, dpr have not actually changed
    props.setPropertyValue("sceneDimensions", sceneDimensions, 2)
    props.setPropertyInheritance("sceneDimensions", true)
  }

  /**
   * Only scenes (and derived scenes) return true
   * @returns {boolean}
   */
  isScene () {
    return true
  }

  /**
   * Sets the scene size.
   * @param width {number}
   * @param height {number}
   */
  setSize (width, height) {
    this.set({ width, height })
  }

  _update () {
    this.calculateSceneDimensions()
  }

  getInterface() {
    return sceneInterface
  }

  /**
   * This function updates all the elements and is the only one with the authority to mark all properties, including
   * inheritable properties, as unchanged.
   */
  updateAll () {
    this.apply(child => { child.update() })

    // Mark the update as completed (WIP)
    this.apply(child => child.props.markGlobalUpdateComplete())
  }
}

attachGettersAndSetters (Scene.prototype, sceneInterface)
