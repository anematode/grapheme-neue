
const testEnforcer = {
  "thickness" : {
    description: "The thickness of the line.",
    validate: th => (typeof th === "number") && Math.abs(th) < 50,
    inherit: false,
    copy: false
  },
  "width": {
    alias: "sceneWidth"
  },
  "sceneWidth": {
    description: "The width of the plot in CSS pixels.",
    validate: w => (typeof w === "number") && Number.isInteger(w) && w >= 100 && w <= 16384,
    inherit: false,
    computedOnly: false,
    copy: false
  },
  "sceneHeight": {
    description: "The width of the plot in CSS pixels.",
    validate: w => (typeof w === "number") && Number.isInteger(w) && w >= 100 && w <= 16384,
    inherit: false,
    computedOnly: false,
    copy: false
  }
}

export class ElementProps {
  constructor () {
    this.store = new Map()
    this.needsUpdate = true
  }

  set (propName, value) {
    const store = this.store

    const propStore = store.get(propName)

    // Deleting a value
    if (value === undefined) {
      if (!propStore) return

      propStore.value = undefined
      propStore.changed = true
    } else {
      if (propStore) {
        if (propStore.value === value) return

        propStore.value = value
        propStore.changed = true
      } else {
        store.set(propName, { value, changed: true })
      }
    }

    this.needsUpdate = true
  }

  // Gets the prop store of an element, CREATING IT IF UNDEFINED.
  getPropStore (propName, createIfUndef=true) {
    let propStore = this.store.get(propName)

    if (!propStore && createIfUndef) {
      propStore = { value: undefined, changed: true }
      this.store.set(propName, propStore)
    }

    return propStore
  }

  forEach (callback, includeDeletedProps=false) { // passed propName, propStore
    for (const [propName, propStore] of this.store.entries()) {
      if (!includeDeletedProps && propStore.value === undefined) continue
      callback(propName, propStore)
    }
  }

  forEachChanged (callback, includeDeletedProps=true) {
    this.forEach((propName, propStore) => {
      if (propStore.changed) {
        callback(propName, propStore)
      }
    }, includeDeletedProps)
  }

  get (propName) {
    const propStore = this.store.get(propName)

    return propStore ? propStore.value : undefined
  }

  has (propName) {
    return this.get(propName) === undefined
  }

  hasChanged (propName) {
    return this.store.get(propName)?.changed
  }

  markChanged (propName, changed=true) {
    const propStore = this.store.get(propName)

    if (!propStore) {
      if (changed) {
        this.set(propName, undefined)
      }
    } else {
      propStore.changed = changed
    }
  }

  markAllChanged (changed=true) {
    for (const [, propStore] of this.store.entries()) {
      propStore.changed = changed
    }
  }

  delete (propName) {
    this.set(propName, undefined)
  }

  // Remove property stores that are undefined and have changed: false
  removeUnused () {
    for (const [propName, propStore] of this.store.entries()) {
      if (propStore.value === undefined && propStore.changed) this.store.delete(propName)
    }
  }
}
