import {Element} from "./element"


export class Group extends Element {
  constructor (params={}) {
    super(params)

    this.children = []
  }

  add (elem, checkCyclic=true) {
    if (elem.isScene())
      throw new Error("Scene cannot be a child")
    if (elem.parent)
      throw new Error("Parent already there")
    if (!(elem instanceof Element))
      throw new TypeError("Element not element")
    if (elem === this)
      throw new Error("Can't add self")
    if (checkCyclic && elem.isChild(this))
      throw new Error("Can't make cycle")

    this.children.push(elem)
    elem.parent = this
    elem.setScene(this.scene)

    return this
  }

  remove (elem) {
    const index = this.children.indexOf(elem)

    if (index !== -1) {
      this.children.splice(index, 1)
      elem.parent = null
      elem.setScene(null)

      return this
    }

    throw new Error("Not a child")
  }

  applyRecursively (func) {
    func(this)

    this.children.forEach(child => child.applyRecursively(func))
  }

  isGroup () {
    return true
  }

  setScene (scene) {
    this.scene = scene
    this.children.forEach(child => child.setScene(scene))
  }

  isChild (elem, recursive=true) {
    for (const child of this.children) {
      if (child === elem) return true
      if (recursive && child.isChild(elem, true)) return true
    }

    return false
  }

  sortChildren () {
    this.children.sort((c1, c2) => c1.ordering - c2.ordering)
  }

  isDirectChild (elem) {
    return this.isChild(elem, false)
  }

  // todo
  triggerEvent (eventName, data) {

  }

  // Recursively update. This won't be a trivial system.
  update () {
    this.children.forEach(child => child.update())
  }
}
