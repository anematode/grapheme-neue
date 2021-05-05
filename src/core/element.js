/**
 * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
 * DOM elements, being nestable and having events.
 *
 * An Element has properties, which may be explicitly specified, inherited
 */

import {Eventful} from "./eventful"
import {getStringID} from "./utils"
import {_inheritAllInheritablePropsFromBase, _inheritChangedInheritablePropsFromBase, ElementProps} from "./props"

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
     * Which stage of updating the element is on, relative to its neighbors.
     *
     * updateStage: -2 means needs total recalculation, either just created, added to a parent or removed from a parent
     * updateStage: -1 means finished updating
     * updateStage: 0 means needs to update
     * @type {number}
     */
    this.updateStage = -2


    this.computedProps = new ElementProps()

    /**
     * Used for storing intermediate results required for rendering, interactivity and other things
     * @type {Object}
     * @property
     */
    this.internal = {}
  }

  /**
   * Apply a function to each element of a group
   * @param callback
   */
  apply (callback) {
    callback(this)
  }

  get (propName) {
    return this.props.get(propName)
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

  update () {

  }
}
