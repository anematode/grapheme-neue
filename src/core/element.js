
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
     * The plot associated with the element (there can be only one)
     * @type {Plot}
     * @public
     */
    this.plot = null

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
   * Sets the plot of this element, as well as any children, to the given plot
   * @param plot {Plot}
   */
  _setPlot (plot) {
    this.plot = plot
  }

  /**
   * How many children this element has.
   * @returns {number} 0; no children
   */
  childCount () {
    return 0
  }

  /**
   * Destroy this element, cleaning up its WebGL resources (and potentially releasing handles to other stuff), and
   * removing it as a child; its children will also be destroyed
   */
  destroy () {
    this.removeSelf()
  }

  /**
   * Whether this has any children.
   * @returns {boolean} False; will never have any children
   */
  hasChildren () {
    return false
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
}
