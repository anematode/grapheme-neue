/**
 * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
 * DOM elements, being nestable and having events.
 *
 * An Element has properties, which may be explicitly specified, taken
 */

import {Eventful} from "./eventful"
import {getStringID} from "./utils"

function cleanOldProps (propMap) {
  for (const [k, v] of propMap)
    if (v.value === undefined && !v.changed)
      propMap.delete(k)
}

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
     * Whether the properties need to be computed
     * @type {boolean}
     */
    this.needsPropCompute = false

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
     * These are the properties as computed after inheritance, updating, et cetera. They can be grabbed at any time, but
     * are only final after updating has finished.
     * @type {Map<string, {}>}
     * @property
     */
    this.computedProps = new Map()
  }

  /**
   * Get the storage object of a property, CREATING IT if the property doesn't exist.
   * @param propName {string}
   * @private
   */
  _getPropStorageObject (propName) {
    const storageObject = this.props.get(propName)

    if (!storageObject) {
      this.set(propName, undefined)
      return this.props.get(propName)
    }

    return storageObject
  }

  /**
   * Delete old props whose value is undefined and whose changed value is 0. This means that it was deleted and an
   * update passed where it was already undefined. This cleans up both this.props and this.computedProps.
   */
  cleanOldProps () {
    cleanOldProps(this.props)
    cleanOldProps(this.computedProps)
  }

  /**
   * Compute props from inheritance. The algorithm is as follows:
   * - If there is no parent, start from scratch and simply copy over the local props.
   * - If there is a parent, iterate through its computed props
   */
  computeProps (treatAllAsChanged=true) {

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
   * Get the value of a computed prop. Its validity depends on the update stage.
   * @param propName
   */
  getComputedProp (propName) {
    return this.computedProps.get(propName)?.value
  }

  /**
   * Get the inheritance level of a property.
   * @param propName
   * @param inheritanceLevel
   * @returns {number}
   */
  getInheritLevel (propName, inheritanceLevel=0) {
    // Returns 0 if the property is undefined
    return +this.props.get(propName)?.inherit
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
   * Explicitly mark that the value of a local property has changed.
   * @param propName {string}
   * @returns {Element} Self, for chaining
   */
  markChanged (propName) {
    const storageObject = this._getPropStorageObject(propName)
    storageObject.changed = true

    this.needsPropCompute = true

    return this
  }

  /**
   * Set a prop on this element. Elements are deleted by setting their value to undefined. Note that we do this
   * because setting their value to undefined allows us to mark it as changed, and then we can delete it once it no
   * longer means anything.
   *
   * This function can also be used with the signature of setMultiple as an overload.
   * @param propName {string|{}} Name of the property to set
   * @param value {any} The value of the property
   * @param config {{}}
   * @param config.inherit {number} The inheritance of the prop (default 0)
   * @param config.forceMark {boolean} Mark the prop as changed even if the value is the same (default 0)
   * @returns {Element} Self, for chaining
   */
  set (propName, value, config={}) {
    if (typeof propName !== "string") {
      //
      this.setMultiple(propName, value)
    } else {
      let { inherit, forceMark } = config

      const inheritExplicitlyGiven = inherit !== undefined

      // Funnily enough, all the default values are fine for this conversion
      inherit = +inherit
      forceMark = !!forceMark

      const props = this.props

      let storageObject = props.get(propName)
      if (storageObject) {
        if (Object.is(storageObject.value, value)) return this

        storageObject.value = value
        storageObject.changed = true

        if (inheritExplicitlyGiven)
          storageObject.inherit = inherit
      } else {
        // If the prop doesn't already exist, we look up its inheritance information
        // TODO

        storageObject = {value, changed: value !== undefined, inherit }
        props.set(propName, storageObject)
      }
    }

    this.needsPropCompute = true

    return this
  }

  /**
   * Set the inheritance level on a property. Note that this also marks the property as changed. This shouldn't cause
   * unnecessary calculations too often, because inheritance level is usually set at the beginning.
   * @param propName {string} Name of the property
   * @param inheritanceLevel {number} 0 if no inherit, 1 if inherit, 2 if inherit and children cannot override
   * @returns {Element} Self, for chaining
   */
  setInheritLevel (propName, inheritanceLevel=0) {
    const storageObject = this._getPropStorageObject(propName)
    storageObject.inherit = inheritanceLevel
    storageObject.changed = true

    return this
  }

  /**
   * Set props on this element via dictionary.
   * @param props {{}} Dictionary of properties to set
   * @param config
   */
  setMultiple (props, config={}) {
    for (const [name, v] of Object.entries(props)) {
      this.set(name, v, config) // value is the inheritance level
    }

    return this
  }

  setOrdering (ordering) {
    this.parent.updateStage = 0
  }
}
