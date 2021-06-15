import {Group} from "./group.js"
import {BoundingBox} from "../math/bounding_box.js"
import {attachGettersAndSetters, constructInterface} from "./interface.js"
import {Color, Colors} from "../styles/definitions.js"

// Example interface
const sceneInterface = constructInterface({
  "dpr": { typecheck: "number", description: "The device pixel ratio of the scene." },
  "width": { typecheck: "number", description: "The width, in CSS pixels, of the scene." },
  "height": { typecheck: "number", description: "The height, in CSS pixels, of the scene." },
  "sceneDims": { readOnly: true, aliases: [ "dimensions" ], description: "An aggregate of the width, height, canvasWidth, canvasHeight, and dpr of the scene." },
  "backgroundColor": { conversion: Color.fromObj, description: "The background color of the scene."}
})

const defaults = {
  width: 640,
  height: 480,
  dpr: 1,
  backgroundColor: Colors.TRANSPARENT
}

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
  getInterface() {
    return sceneInterface
  }

  init (params) {
    this.scene = this

    this.props.setPropertyInheritance("sceneDims", true)
  }

  /**
   * Compute the internal property "sceneDimensions"
   */
  calculateSceneDimensions () {
    const { props } = this

    if (props.haveChanged(["width", "height", "dpr"])) {
      const { width, height, dpr } = props.proxy
      const sceneDimensions = new SceneDimensions(width, height, dpr)

      // Equality check of 2 for deep comparison, in case width, height, dpr have not actually changed
      props.set("sceneDims", sceneDimensions, 2)
    }
  }

  updateProps () {
    const { props } = this

    this.forwardDefaults(defaults, "real")
    this.calculateSceneDimensions()
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
    this.updateProps()

    this.internal.renderInfo = {
      contexts: {
        type: "scene",
        dims: this.get("sceneDims"),
        backgroundColor: this.get("backgroundColor")
      }
    }

    this.props.markAllUpdated()
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
