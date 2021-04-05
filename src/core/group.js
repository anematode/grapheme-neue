import {Element} from "./element"

// Approximate memory pressure: 330 bytes / group when empty. Most of that space comes from the Maps. This is rather
// unfortunate, but we might be able to fix the prop system at some point.

export class Group extends Element {
  constructor (params={}) {
    super(params)

    this.children = []
  }

  add (elem) {
    if (elem.isScene())
      throw new Error("Scene cannot be a child")
    if (elem.parent)
      throw new Error("Parent already there")
    if (!(elem instanceof Element))
      throw new TypeError("Element not element")
    if (elem === this)
      throw new Error("Can't add self")

    this.children.push(elem)
    elem.parent = this

    return this
  }

  remove (elem) {
    const index = this.children.indexOf(elem)

    if (index !== -1) {
      this.children.splice(index, 1)
      elem.parent = null

      return this
    }

    throw new Error("Not a child")
  }

  isGroup () {
    return true
  }

  // todo
  triggerEvent (eventName, data) {

  }

  // Recursively update. This won't be a trivial system.
  update () {

  }
}
