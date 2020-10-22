
import {getID} from "../utils.js"
import {Eventful} from "./eventful.js"

/**
 * The base class for all elements in a Grapheme canvas. Grapheme uses a similar style to THREE.js: elements exist in a
 * tree structure. For each call to the plot's render() function, the tree is traversed, and any elements which are
 * visible and marked for updating (via markUpdate()) have their _update() function called with <i>updateInfo</i> as a
 * single parameter. The order of updating is guaranteed to be the same as precedence, and <i>_update()</i> should be a
 * generator function, to allow for both synchronous and asynchronous updating. Once finished updating, the elements are
 * traversed again and rendered. Similarly to _update(), _render() is a generator function to allow for asynchronous
 * rendering. Unlike _update(), however, two children in the same universe cannot be rendered asynchronously simultaneously.
 * It would be annoying to have to copy the canvas, buffers, and the GL state every time when switching between children.
 * Thus, only one plot may have control over the canvas at a time.
 */
export class Element extends Eventful {
  /**
   * Abbreviated form for identifying elements of this class; subclasses may define this differently
   * @type {string}
   */
  static abbrName = "element"

  /**
   * Construct a new Grapheme element.
   * @param params {Object} Parameters
   * @param params.precedence {number} The drawing precedence of this object
   * @param params.id {string} The id of this element (will be randomly generated if not provided)
   */
  constructor({ precedence = 0, id = '' } = {}) {
    super()

    /**
     * The children of this Group.
     * @type {Array}
     * @private
     */
    this.children = []

    /**
     * A unique ID associated with this element to disambiguate it from other elements, and to be used in things like
     * WebGL buffer names. May be defined in params
     * @type {string}
     * @private
     */
    this.id = id ? id + '' : this.constructor.abbrName + "-" + getID()

    /**
     * Whether this element needs to be updated. This can be marked using the function markUpdate(). Updating occurs
     * before rendering.
     * @type {boolean}
     * @public
     */
    this.needsUpdate = false

    /**
     * The parent of this element (there can be only one)
     * @type {Element}
     * @public
     */
    this.parent = null

    /**
     * The order in which this element will be drawn. Two given elements, e1 and e2, who are children of the same element,
     * will have e1 drawn first before e2 is drawn if e1.precedence < e2.precedence. The same thing applies to updating;
     * e1 will be updated before e2 is updated
     * @type {number}
     * @public
     */
    this.precedence = precedence

    /**
     * Whether this element is visible. If the element is marked as invisible, it will not be updated OR rendered;
     * however, needsUpdate will remain unmodified and events will still propagate
     * @type {boolean}
     * @public
     */
    this.visible = true
  }

  /**
   * Mark the element as needing to be updated at the next render call.
   */
  markUpdate () {
    this.needsUpdate = true
  }

  /**
   * Remove this element from its parent
   * @returns {Element} Returns itself (for chaining)
   */
  removeSelf () {
    if (this.parent) this.parent.remove(this)

    this.plot = null
    this.parent = null

    return this
  }

  /**
   * Returns whether the given element may be added to this element as a child
   * @param element {Element}
   * @returns {boolean}
   * @private
   */
  _isValidChild (element) {
    return (element instanceof Element) && !element.parent && !element.isPlot()
  }

  /**
   * Add an element as a child of this element. Corresponding inverse operation is remove(child).
   * @param element {Array|Element} Array of elements, or single element to remove
   * @returns {Element} Returns itself (for chaining)
   */
  add (element) {
    if (Array.isArray(element)) {
      for (let i = 0; i < element.length; ++i) {
        this.add(element[i])
      }
    } else if (arguments.length > 1) {
      // Additional elements passed as arguments
      for (let i = 0; i < arguments.length; ++i) {
        this.add(arguments[i])
      }
    } else {
      if (!this._isValidChild(element)) {
        throw new TypeError("Invalid element given")
      }

      element.parent = this
      this.children.push(element)
    }

    return this
  }

  /**
   * Whether this element is a top-level plot, needing no parent (it's not)
   */
  isPlot () {
    return false
  }

  /**
   * How many children this element has.
   * @returns {number}
   */
  childCount () {
    return this.children.length
  }

  destroy () {
    this.removeSelf()

    // Destroy children
    if (this.hasChildren()) {
      const children = this.children.slice()
      this.removeAll()
      for (let i = 0; i < children.length; ++i) {
        children[i].destroy()
      }
    }
  }

  /**
   * Whether this has any children.
   * @returns {boolean}
   */
  hasChildren () {
    return this.children.length !== 0
  }

  /**
   * Remove an immediate child from the element. Fails silently if the child is not a child of this element.
   * @param child {Array|Element|string} Array of elements, single element, or id of element to remove.
   * @returns {Element} Returns itself (for chaining)
   */
  remove (child) {
    let index = -1

    if (child instanceof Element) {
      index = this.children.indexOf(child)
    } else if (typeof child === "string") {
      index = this.children.findIndex(c => c.id === child)
    } else if (child instanceof Array) {
      // If the provided array is literally the children, call removeAll() instead
      if (child !== this.children) {
        for (let i = 0; i < child.length; ++i) {
          this.remove(child[i])
        }
      }
    } else if (arguments.length > 1) {
      for (let i = 0; i < arguments.length; ++i) {
        this.remove(arguments[i])
      }
    } else {
      throw new TypeError("Given parameter is not an array of elements or an element")
    }

    if (index !== -1) {
      // Remove from children
      this.children.splice(index, 1)

      child.parent = null
    }

    return this
  }

  /**
   * Remove all the children from this element; faster than calling remove( ... ) individually.
   * @returns {Element} Returns itself (for chaining)
   */
  removeAll () {
    this.children.forEach(child => {
      child.parent = null
    })

    this.children = []
    return this
  }
}
