import { Element } from "./element"

class Group extends Element {

  constructor(params={}) {
    super(params)

    /**
     * Children of this element.
     * @type {Array}
     */
    this.children = []
  }

  /**
   * Trigger an event, potentially propagating it to children
   * @param eventName {string} Name of the event to be triggered
   * @param data {any} Optional data parameter to be passed to listeners
   * @param opts {Object}
   * @param opts.propagate {boolean} Whether to propagate the event to children
   * @param opts.reverse {boolean} Whether to call children of higher precedence value first
   * @param opts.childrenFirst {boolean} Whether to trigger this element's events first, or the children's
   * @returns {boolean} Whether any listener stopped propagation
   */
  triggerEvent(eventName, data, opts = { propagate = true, reverse = false, childrenFirst = false } = {}) {

  }
}
