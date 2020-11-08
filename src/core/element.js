import { getID } from '../utils.js'
import { Eventful } from './eventful.js'

/**
 * The base class for all elements in a Grapheme canvas. Grapheme uses a similar style to THREE.js: elements exist in a
 * tree structure. For each call to the scene's render() function, the tree is traversed, and any elements which are
 * visible and marked for updating (via markUpdate()) have their _update() function called with <i>updateInfo</i> as a
 * single parameter. The order of updating is guaranteed to be the same as precedence, and <i>_update()</i> should be a
 * generator function, to allow for both synchronous and asynchronous updating. Once finished updating, the elements are
 * traversed again and rendered. Similarly to _update(), _render() is a generator function to allow for asynchronous
 * rendering. Unlike _update(), however, two children in the same universe cannot be rendered asynchronously simultaneously.
 * It would be annoying to have to copy the canvas, buffers, and the GL state every time when switching between children.
 * Thus, only one scene may have control over the renderer at a time.
 */
export class Element extends Eventful {
  /**
   * Construct a new Grapheme element.
   * @param params {Object} Parameters
   * @param params.precedence {number} The drawing precedence of this object
   * @param params.id {string} The id of this element (will be randomly generated if not provided)
   */
  constructor ({ precedence = 0, id = '' } = {}) {
    super()

    /**
     * The children of this Group.
     * @type {Array}
     * @private
     */
    this.children = []

    /**
     * A unique ID associated with this element to disambiguate it from other elements, and to be used in things like
     * WebGL buffer names. May be custom defined in params, but then it is the user's responsibility to prevent name
     * clashes
     * @type {string}
     * @private
     */
    this.id = id ? id + '' : this.getTagName() + '-' + getID()

    /**
     * Whether this element needs to be updated. This can be marked using the function markUpdate(). Updating occurs
     * before rendering, and includes both the recomputation of props and the actual updating.
     * @type {boolean}
     * @public
     */
    this.needsUpdate = true

    /**
     * Whether this element needs its computed props to be updated.
     * @type {boolean}
     * @public
     */
    this.needsPropCompute = true

    /**
     * The parent of this element (there can be only one)
     * @type {Element}
     * @public
     */
    this.parent = null

    /**
     * The highest level element in the chain, defining a width and height of the scene (and potentially a canvas, etc.)
     * @type {Element}
     * @public
     */
    this.scene = null

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

    /**
     * Props object containing the properties of this element. Note that some properties can be *inherited*. Instead of
     * being accessed directly, properties are manipulated via setProp, clearProp, et cetera.
     * @type {Object}
     * @private
     */
    this.props = {}

    /**
     * Computed properties of this object. It contains all the overrideable properties from props, as well as
     * any inherited properties and (eventually) any properties from the global styling information.
     * @type {Object}
     * @private
     */
    this.computedProps = {}

    /**
     * Internal values computed by the update() function for the render() function to use. May also include things like
     * bounding boxes which are intended to be accessed by others
     * @type {Object}
     * @private
     */
    this.internal = {}
  }

  /**
   * Internal function used to avoid constant parameter packing and unpacking
   * @private
   */
  _forEach (callback, childrenFirst, topmost, recursive, reverse, terminateOnReturn) {
    const wrap = (value, element) => ({ value, element })

    // At least one child
    if (topmost && !childrenFirst) {
      const ret = callback(this)
      if (terminateOnReturn && ret) return wrap(ret, this)
    }

    const { children } = this

    if (children.length !== 0) {
      const iStart = reverse ? (children.length - 1) : 0
      const iEnd = reverse ? -1 : children.length
      const iStep = reverse ? -1 : 1

      for (let i = iStart; i !== iEnd; i += iStep) {
        const child = children[i]
        const noSubchildren = child.children.length === 0

        if (noSubchildren || !childrenFirst) { // Quicky, can just call callback ourselves
          const ret = callback(child)
          if (terminateOnReturn && ret) return wrap(ret, child)

          if (noSubchildren) continue
        }

        if (recursive) {
          const ret = child._forEach(callback, childrenFirst, false, true, reverse, terminateOnReturn)

          if (terminateOnReturn && ret) return ret // already wrapped
        }

        if (childrenFirst) {
          const ret = callback(child)
          if (terminateOnReturn && ret) return wrap(ret, child)
        }
      }
    }

    if (topmost && childrenFirst) {
      const ret = callback(this)
      if (terminateOnReturn && ret) return wrap(ret, this)
    }
  }

  /**
   * Set the scene of this element, as well as all children, to the given scene
   * @param scene
   * @private
   */
  _setScene (scene) {
    // Unless the user does something dumb, we know that all the scenes underneath this elem are the same, so we only
    // have to set it when it changes
    if (scene === this.scene) {
      return
    }

    // Set this element's scene, along with all of its children's scenes
    this.forEach(elem => elem.scene = scene)
  }

  /**
   * Throws a descriptive error if element is not a valid child to be added to this element.
   * @param element {Element}
   * @private
   */
  _throwIfInvalidChild (element) {
    if (!(element instanceof Element)) {
      throw new TypeError('Given element is not instance of Grapheme.Element')
    } else if (element.parent) {
      throw new Error('Given element already has a parent')
    } else if (element.scene) {
      throw new Error('Given element already has a scene')
    } else if (element.isScene()) {
      throw new Error('Given element is a scene and thus cannot be a child of another element')
    }
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
      this._throwIfInvalidChild(element)

      element.parent = this
      element._setScene(this.scene)

      this.children.push(element)
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

  /**
   * Delete a prop.
   * @param propName {string}
   * @returns {Element} Returns self (for chaining)
   */
  clear (propName) {
    this.set(propName, undefined)
  }

  /**
   * Update computedProps with the correct values.
   */
  computeProps () {
    if (!this.needsPropCompute) return

    this.needsPropCompute = false


  }

  configureInheritance (propName, config = {}) {
    const prop = this.props[propName]

    if (!prop || prop.value === undefined) return this

    const cascades = !!config.cascades
    const overridable = !!config.overridable

    prop.cascades = cascades
    prop.overridable = overridable
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
   * A function to iterate through the tree of an element. It is assumed that the callback does
   * not modify the element tree; in that case, behavior is undefined
   * @param callback {Function} The function to call with children, with a single parameter (child).
   * @param childrenFirst {boolean} Whether to call callback on children before parent nodes
   * @param topmost {boolean} Whether to call the callback on the element forEach() is being called on
   * @param recursive {boolean} Whether to recurse deeper into elements
   * @param reverse {boolean} Whether to call the children in reverse order
   * @param terminateOnReturn {boolean} Whether to stop propagation if a callback returned a truthy value.
   * @returns {{value, element}} If terminateOnReturn is true and a callback returns a truthy value, then { value, element } is returned
   */
  forEach (callback, { childrenFirst = false, topmost = true, recursive = true, reverse = false, terminateOnReturn = false } = {}) {
    return this._forEach(callback, childrenFirst, topmost, recursive, reverse, terminateOnReturn)
  }

  /**
   * Get a prop's value
   * @param propName {string}
   * @returns {any} The prop's value, and undefined if that prop is not defined.
   */
  get (propName) {
    const prop = this.props[propName]

    if (!prop || prop.value === undefined) {
      return undefined
    }

    return prop.value
  }

  /**
   * Abbreviated form for identifying elements of this class; subclasses should define this differently
   * @returns {string}
   */
  getTagName () {
    return 'element'
  }

  /**
   * Whether this element has a given prop.
   * @param propName {string}
   * @returns {boolean}
   */
  has (propName) {
    const prop = this.props[propName]

    return !!prop && prop.value !== undefined
  }

  /**
   * Whether this has any children.
   * @returns {boolean}
   */
  hasChildren () {
    return this.children.length !== 0
  }

  /**
   * Whether this element is a top-level scene, thus needing no parent
   */
  isScene () {
    return false
  }

  markChanged (propName) {
    const prop = this.props[propName]

    if (prop && prop.value !== undefined) {
      prop.changed = true
      this.needsPropCompute = true
    }
  }

  /**
   * Mark the element as needing to be updated at the next render call.
   */
  markUpdate () {
    this.needsUpdate = true
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
    } else if (typeof child === 'string') {
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
      throw new TypeError('Given parameter is not an array of elements or an element')
    }

    if (index !== -1) {
      // Remove from children
      this.children.splice(index, 1)

      child.parent = null
      child._setScene(null)
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
      child._setScene(null)
    })

    this.children = []
    return this
  }

  /**
   * Remove this element from its parent
   * @returns {Element} Returns itself (for chaining)
   */
  removeSelf () {
    if (this.parent) this.parent.remove(this)

    this.parent = null
    this.scene = null

    return this
  }

  /**
   * Set the value of the prop propName to value. props may not have undefined as a value; such props will instead be
   * cleared. Props in this.props are stored in the form { value, cascades: true/false, overridable: true/false,
   * changed: true/false }. Value is the value of the prop, of course. Cascades determines whether the prop will be
   * cascaded in computedProps to child elements. Overridable determines whether children can override the prop
   * (usually false). Changed keeps track of whether computedProps needs to be updated with the new value from this
   * prop.
   * @param propName
   * @param value
   * @param config Optionally, cascade and overridable attributes to add to the prop.
   * @returns {Element} Returns self (for chaining)
   */
  _set (propName, value, config) {
    const { props } = this

    // Special case: clearing a prop
    if (value === undefined) {
      if (props[propName]) { // This will only happen if a prop compute hasn't happened and removed the prop
        const prop = props[propName]

        prop.value = undefined
        prop.changed = true
      } else {
        // Otherwise nothing is needed
        return this
      }
    } else {
      if (props[propName]) { // Updating an already existing prop
        const prop = props[propName]

        prop.value = value
        prop.changed = true
      } else { // New prop!
        props[propName] = { value, changed: true }
      }
    }

    if (config) this.configure(propName, config)
    this.needsPropCompute = true


    return this
  }

  sortChildren () {
    if (this.hasChildren()) this.children.sort((c1, c2) => {})
  }
}
