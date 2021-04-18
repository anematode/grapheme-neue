/**
 * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
 * DOM elements, being nestable and having events.
 *
 * An Element has properties, which may be explicitly specified, inherited
 */

import {Eventful} from "./eventful"
import {getStringID} from "./utils"
import {ElementProps} from "./props"

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
     * Which stage of updating the element is on, relative to its neighbors
     * @type {number}
     */
    this.updateStage = 0

    /**
     * The index in which this element will be rendered (sorted within its group). This doesn't mean the actual index
     * in the array of children, just the drawing order
     * @type {number}
     * @property
     */
    this.ordering = params.ordering ?? 0

    /**
     * @type {ElementProps}
     * @property
     */
    this.props = new ElementProps()

    /**
     * These are the properties as computed after inheritance, updating, et cetera. They can be grabbed at any time, but
     * are only final after updating has finished. Their definitions can be rather complicated.
     * @type {ElementProps}
     * @property
     */
    this.computedProps = new ElementProps()

    /**
     * Used for storing potentially useful intermediate results, etc.
     * @type {Object}
     * @property
     */
    this.internal = {}
  }

  // In this simplest case, we just forward each element of this.props to this.computedProps and inherit it.
  computeProps () {

  }

  applyRecursively (func) {
    func(this)
  }

  get (propName) {
    return this.props.get(propName)
  }

  isChild (child, recursive=true) {
    return false
  }

  /**
   * Whether this element can have children.
   * @returns {boolean}
   */
  isGroup () {
    return false
  }

  isScene() {
    return false
  }

  set (propName, value) {
    this.props.set(propName, value)
    return this
  }

  setScene (scene) {
    this.scene = scene
  }

  update () {

  }

  getRenderingInstructions () { // Generate instructions to render, given a gl, glManager,

  }
}
