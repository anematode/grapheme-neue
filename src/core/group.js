import {Element} from "./element"
import {
  _inheritAllChangedPropsFromBase,
  _inheritAllInheritablePropsFromBase,
  _inheritChangedInheritablePropsFromBase
} from "./props"


export class Group extends Element {
  constructor (params={}) {
    super(params)

    this.children = []
  }

  /**
   * Add an element to this group.
   * @param elem {Element}
   * @returns {Group}
   */
  add (elem) {
    if (elem.isScene())
      throw new Error("Scene cannot be a child")
    if (elem.parent)
      throw new Error("Parent already there")
    if (!(elem instanceof Element))
      throw new TypeError("Element not element")
    if (elem === this)
      throw new Error("Can't add self")
    if (elem.isChild(this))
      throw new Error("Can't make cycle")

    this.children.push(elem)
    elem.parent = this
    elem.setScene(this.scene)

    elem.updateStage = -2

    return this
  }

  /**
   * Run callback(element) on this element and all the element's children
   * @param callback {Function}
   */
  apply (callback) {
    callback(this)

    this.children.forEach(child => child.apply(callback))
  }

  /**
   * Whether the given element is a child of this element
   * @param elem {Element}
   * @param recursive {boolean} If true, whether it is any child; if false, whether it is a direct child
   * @returns {boolean}
   */
  isChild (elem, recursive=true) {
    for (const child of this.children) {
      if (child === elem) return true
      if (recursive && child.isChild(elem, true)) return true
    }

    return false
  }

  isGroup () {
    return true
  }

  remove (elem) {
    const index = this.children.indexOf(elem)

    if (index !== -1) {
      this.children.splice(index, 1)
      elem.parent = null
      elem.setScene(null)

      elem.updateStage = -2

      return this
    }

    throw new Error("Not a direct child")
  }

  setScene (scene) {
    this.scene = scene
    this.children.forEach(child => child.setScene(scene))
  }

  // todo
  triggerEvent (eventName, data) {

  }

  update (updateParams) {
    if (this.updateStage === -1) return

    this._defaultInheritProps()

    this.updateStage = -1
  }
}
