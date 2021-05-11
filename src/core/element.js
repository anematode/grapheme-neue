/**
 * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
 * DOM elements, being nestable and having events.
 *
 * An Element has properties, which may be explicitly specified, inherited
 */

import {Eventful} from "./eventful"
import {getStringID, getVersionID} from "./utils"
import {Props} from "./props"

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

    /**
     * Whether the element should be rendered. Generally, its update function is not called either.
     * @type {boolean}
     */
    this.visible = true

    // Updated = 100, needs complete init = -1, needs update = 0
    this.updateStage = -1

    /**
     * Used for storing intermediate results required for rendering, interactivity and other things
     * @type {Object}
     * @property
     */
    this.internal = {
      version: getVersionID()
    }
  }

  /**
   * In this default behavior, all the properties from a parent are inherited.
   */
  defaultInheritProps () {
    if (this.parent)
      this.props.inheritPropertiesFrom(this.parent.props, this.updateStage === -1)
  }

  /**
   * In this behavior, only properties with the given names are inherited.
   */
  inheritCertainProps () {

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

  /**
   * This function is called when a renderer wants to know how a particular element should be rendered. It may return
   * a primitive drawing call, such as a call to triangle strip, or a function, which accepts a renderer as an argument.
   * It may also return a list of such calls, in which case the calls will be executed in that order.
   * This function is not necessarily called every time a render is done. Its result can be (but is not always) cached,
   * which may seem a bit pointless in and of itself, but it helps with optimization. Instead, the function is only
   * called when a given element's "version" value is greater than that of the renderer's last stored version value.
   * The version value is simply a number which increments sequentially, starting from 0 at the beginning of the page's
   * lifetime and adding one every time a value is requested. The element can thus force a renderer update by setting
   * its version to the latest getVersionID() value, in which case the renderer will see that something has changed and
   * ask for new instructions.
   */
  getRenderingInstructions () {

  }

  isChild (child, recursive=true) {
    return false
  }

  isScene () {
    return false
  }

  setScene (scene) {
    this.scene = scene
  }

  /**
   * Set the value of a property, as an external user.
   * @param propName {string|{}} The property name, or a dictionary of properties and values
   * @param [value] {*} The value to set the property to
   * @returns {Element}
   */
  set (propName, value) {
    if (typeof propName === "object") {
      for (const [propNameKey, propValue] of Object.entries(propName)) {
        this._set(propNameKey, propValue)
      }
    } else {
      this._set(propName, value)
    }

    // If some properties have changed, set the update stage accordingly. We use .min in case the update stage is -1
    if (this.props.hasChangedProperties)
      this.updateStage = Math.min(this.updateStage, 0)

    return this
  }

  /**
   * Internal function that elements define to actually describe the behavior of setting a property.
   * @param propName {string}
   * @param value {any}
   * @private
   */
  _set (propName, value) {

  }

  /**
   * Function which updates the element, but which should generally be called during an "updateAll" operation from the
   * scene. When called on its own, it will thus be allowed to mark its own properties as not changed, if appropriate,
   * as long as it is (almost) functionally identical to if they were marked as changed during a full updateAll
   * operation.
   */
  update () {
    this._update()

    this.updateStage = 100
  }

  _update () {

  }
}
