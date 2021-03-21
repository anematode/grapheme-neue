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
     * The parent of this element; null if it has no parent
     * @property
     */
    this.parent = null

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
     * Whether there is a prop that has changed since last time updating had completed
     * @type {boolean}
     */
    this.propsChanged = false

    /**
     * We define the properties for this element. For each property we store { value: prop, inherit: 0, changed: false }.
     * Inherit 0 means no inheritance. Inherit 1 means total inheritance. Inherit 2 means total inheritance, and child
     * elements cannot override the value. Changed true means the property has changed since this Element finished the
     * last update stage.
     * @type {Map<string, {}>}
     * @property
     */
    this.props = new Map()

    /**
     * These are the properties as computed after inheritance, and other operations. It may include properties that
     * aren't even in props, like boundingBox and stuff. The value of the properties may change throughout the update
     * stages.
     * @type {Map<string, {}>}
     * @property
     */
    this.computedProps = new Map()
  }

  /**
   * Convenience function
   */
  remove () {
    this.parent.removeChild(this)
  }

  /**
   * Set the element's update stage, but take the minimum of the current and given stage
   * @param stage {number}
   */
  limitUpdateStage (stage=0) {
    this.updateStage = Math.min(this.updateStage, stage)
  }

  /**
   * Get the value of a computed prop. Its validity depends on the update stage.
   * @param propName
   */
  getComputedProp (propName) {
    return this.computedProps.get(propName)?.value
  }

  setOrdering (ordering) {
    this.parent.updateStage = 0
  }

  /**
   * Set a prop on this element. Elements are deleted by setting their value to undefined. Note that we do this
   * because setting their value to undefined allows us to mark it as changed, and then we can delete it once it no
   * longer means anything.
   * @param propName {string|{}} Name of the property to set; alternatively, a dictionary of values to set
   * @param value {any} The value of the property
   * @returns {Element} Self, for chaining
   */
  set (propName, value) {
    if (typeof propName !== "string") {
      for (const [name, value] of Object.entries(propName)) {
        this.set(name, value)
      }
    } else {
      const props = this.props

      let storageObject = this.props.get(propName)
      if (!!storageObject) {


        storageObject.value = value
        storageObject.changed = true
      } else {
        // If the prop doesn't already exist, we look up its inheritance information
        // TODO

        storageObject = {value, changed: true, inherit: 0}
        props.set(propName, storageObject)
      }
    }

    this.propsChanged = true

    return this
  }

  /**
   * Check whether this element has a given property.
   * @param propName {string}
   * @returns {boolean}
   */
  has (propName) {
    const p = this.props.get(propName)

    return p && p.value !== undefined
  }

  /**
   * Get the value of a property, returning undefined if it doesn't exist.
   * @param propName {string}
   * @returns {any}
   */
  get (propName) {
    const storageObject = this.props.get(propName)

    return !storageObject ? storageObject : storageObject.value
  }

  /**
   * Mark that the value of a property has changed.
   * @param propName {string}
   * @returns {Element} Self, for chaining
   */
  markChanged (propName) {
    const storageObject = this.props.get(propName)

    if (!storageObject) {
      // We mark an unknown prop as changing by setting its value to undefined
      this.set(propName, undefined)
      this.markChanged(propName)
    } else {
      storageObject.changed = true
    }

    this.propsChanged = true

    return this
  }

  computeInheritedProps () {

  }

  /**
   * Delete a prop on this element.
   * @param propName
   * @returns {Element} Self, for chaining
   */
  delete (propName) {
    this.set(propName, undefined)

    return this
  }
}
