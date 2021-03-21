/**
 * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
 * DOM elements, being nestable and their behaviors being determined
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
     * @property
     */
    this.id = params.id ?? getStringID()

    /**
     * The index in which this element will be rendered (sorted within its group).
     * @property
     */
    this.ordering = params.ordering ?? 0

    /**
     * Which update stage
     * @type {number}
     * @property
     */
    this.updateStage = 0

    /**
     * We define the properties for this element. For each property we store { value: prop, inherit: 0, changed: false }.
     * Inherit 0 means no inheritance. Inherit 1 means total inheritance. Inherit 2 means total inheritance, and child
     * elements cannot override the value. Changed true means the property has changed since this Element finished the
     * last update stage.
     * @type {Map}
     * @property
     */
    this.props = new Map()

    this.computedProps = new Map()
  }

  /**
   * Set a prop on this element.
   * @param propName {string} Name of the property to set
   * @param value {any} The value of the property
   */
  set (propName, value) {
    const props = this.props

    props.set(propName, value)
  }

  /**
   *
   * @returns {string}
   */
  getTagName () {
    return "element"
  }
}
