/**
 * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
 * DOM elements, being nestable and having events.
 *
 * An Element has properties, which may be explicitly specified, inherited
 */

import {Eventful} from "./eventful"
import {getStringID} from "./utils"
import {Props} from "./new_props"

/**
 * The element class.
 */
export class Element extends Eventful {
  constructor (params={}) {
    super()

    /**
     * Unique string id of this element
     * @type {string}
     * @property
     */
    this.id = params.id ?? getStringID()

    if (typeof this.id !== "string" || this.id.length === 0)
      throw new TypeError("The element id must be a non-empty string.")

    /**
     * The parent of this element; null if it has no parent
     * @type{Element|null}
     * @property
     */
    this.parent = null

    /**
     * The scene this element is a part of; Adam or Eve.
     * @type {Scene|null}
     * @property
     */
    this.scene = null

    /**
     * Stores most of the state of the element. Similar to internal. Generally, should not be accessed directly.
     * @type {Props}
     */
    this.props = new Props()


    // Updated = 100, needs complete init = -1, needs update = 0
    this.updateStage = -1

    /**
     * Used for storing intermediate results required for rendering, interactivity and other things
     * @type {Object}
     * @property
     */
    this.internal = {

    }
  }

  /**
   * Default prop inheriting behavior where all inheritable props are copied over
   */
  defaultInheritProps () {
    if (this.parent)
      this.props.inheritPropertiesFrom(this.parent.props, this.updateStage !== -1)
  }

  stringify () {
    this.props.stringify()
  }

  /**
   * Apply a function to each element of a group
   * @param callback
   */
  apply (callback) {
    callback(this)
  }

  getRenderingInstructions () {

  }

  isChild (child, recursive=true) {
    return false
  }

  isScene() {
    return false
  }

  setScene (scene) {
    this.scene = scene
  }

  set (propName, value) {
    if (typeof propName === "object") {
      for (const [propNameKey, propValue] of Object.entries(propName)) {
        this.set(propNameKey, propValue)
      }

    } else {
      this._set(propName, value)

      if (this.props.hasChangedProperties)
        this.updateStage = 0
    }

    return this
  }

  _set (propName, value) {

  }

  update () {

  }
}
