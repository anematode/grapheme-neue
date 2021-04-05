/**
 * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
 * DOM elements, being nestable and having events.
 *
 * An Element has properties, which may be explicitly specified, inherited
 */

import {Eventful} from "./eventful"
import {getStringID} from "./utils"

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
     * The index in which this element will be rendered (sorted within its group).
     * @type {number}
     * @property
     */
    this.ordering = params.ordering ?? 0

    /**
     * @type {Map<string, {}>}
     * @property
     */
    this.props = new Map()

    /**
     * These are the properties as computed after inheritance, updating, et cetera. They can be grabbed at any time, but
     * are only final after updating has finished. Their definitions can be rather complicated.
     * @type {Map<string, {}>}
     * @property
     */
    this.computedProps = new Map()
  }

  set (propName, value) {
    const { props } = this

    if (props.has(propName)) { // We already have a registered property for that

    }

    props.set(propName, { value, changed: true, inherit: 0 })
  }

  get (propName) {
    if (this.props.has(propName))
      return this.props.get(propName).value
  }

  delete (propName) {
    this.set(propName, undefined)
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

  update () {

  }
}
