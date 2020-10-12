import { Element } from "./element.js"

export class Group extends Element {
  static abbrName = "group"

  /**
   * Construct a new Grapheme group.
   * @param params {Object} Parameters
   * @param params.precedence {number} The drawing precedence of this object
   * @param params.id {string} The id of this element (will be randomly generated if not provided)
   */
  constructor (params = {}) {
    super(params)

    /**
     * The children of this Group.
     * @type {Array}
     * @private
     */
    this.children = []
  }

  /**
   * Sets the plot of this element, as well as any children, to the given plot
   * @param plot {Plot}
   */
  _setPlot (plot) {
    this.plot = plot

    const { children } = this.children
    for (let i = 0; i < children.length; ++i) {
      children[i]._setPlot(plot)
    }
  }

  /**
   * Add an element as a child of this element. Corresponding inverse operation is remove(child).
   * @param element {Array|Element} Array of elements, or single element to remove
   * @returns {Element} Returns itself (for chaining)
   */
  add (element) {
    if (element instanceof Element) {
      if (element.parent || element.plot) {
        throw new Error("Element is already assigned a plot and/or is a child of an element")
      }

      element._setPlot(this.plot)
      element.parent = this
      this.children.push(element)
    } else if (Array.isArray(element)) {
      for (let i = 0; i < element.length; ++i) {
        this.add(element[i])
      }
    } else if (arguments.length > 1) {
      // Additional elements passed as arguments
      for (let i = 0; i < arguments.length; ++i) {
        this.add(arguments[i])
      }
    } else {
      throw new TypeError("Given parameter is not an array of elements or an element")
    }

    return this
  }

  /**
   * How many children this element has.
   * @returns {number}
   */
  childCount () {
    return this.children.length
  }

  destroy () {
    super.destroy()

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

      child._setPlot(null)
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
      child._setPlot(null)
      child.parent = null
    })

    this.children = []
    return this
  }
}
