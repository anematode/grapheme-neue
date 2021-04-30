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
     * Used for storing intermediate results required for rendering and other things
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

  getComputed (propName) {
    return this.computedProps.get(propName)
  }

  getRenderingInstructions () {

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

    if (this.props.needsUpdate)
      this.updateStage = 0

    return this
  }

  setScene (scene) {
    this.scene = scene
  }

  update () {

  }

  _defaultInheritProps () {
    const parentProps = this.parent.computedProps
    const thisProps = this.computedProps

    if (this.updateStage === -2) {
      _inheritAllInheritablePropsFromBase(thisProps, parentProps)
    } else {
      _inheritChangedInheritablePropsFromBase(thisProps, parentProps)
    }

    if (this.computedProps.needsUpdate)
      this.updateStage = 0
  }
}
