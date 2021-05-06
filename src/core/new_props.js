
// The general form of a prop store is { value: , changed: , userValue: , }

import {deepEquals} from "./utils"

const proxyHandlers = {
  get: (target, propName) => {
    return target.getPropertyValue(propName)
  },
  set: (target, propName, value) => {
    target.setPropertyValue(propName, value)
  }
}

/**
 * test class meant for internal use
 */
export class Props {
  constructor (init) {
    this.store = Object.create(null)

    this.hasChangedProperties = false
    this.hasChangedInheritableProperties = false

    // Just for fun... not sure if I'll keep this
    this.proxy = new Proxy(this, proxyHandlers)
  }

  /**
   * Create a property store for a given prop, returning the store. It returns the already-existing store, if appropriate.
   * @param propName {string}
   * @returns {{}} Property store associated with the given property name
   */
  createPropertyStore (propName) {
    // Maybe this is too clever for my own good
    return this.store[propName] ?? (this.store[propName] = { value: undefined, changed: false })
  }

  /**
   * Deletes a property store wholesale, not trying to account for changed values and the like.
   * @param propName
   */
  deletePropertyStore (propName) {
    delete this.store[propName]
  }

  hasPropertyChanged (propName) {
    return !!(this.store[propName]?.changed)
  }

  havePropertiesChanged (propList) {
    return propList.some(prop => this.hasPropertyChanged(prop))
  }

  isPropertyInheritable (propName) {
    return !!(this.store[propName]?.inherit)
  }

  listProperties () {
    return Object.keys(this.store)
  }

  listChangedProperties () {
    return this.listProperties().filter(prop => this.hasPropertyChanged(prop))
  }

  listInheritableProperties () {
    return this.listProperties().filter(prop => this.isPropertyInheritable(prop))
  }

  getPropertyStore (propName) {
    return this.store[propName]
  }

  /**
   * Inherit all inheritable properties from props
   * @param props
   * @param onlyChanged
   */
  inheritPropertiesFrom (props, onlyChanged=true) {
    if (onlyChanged && !props.hasChangedInheritableProperties) return

    const { store } = this
    const otherStore = props.store

    for (const [propName, propStore] of Object.entries(otherStore)) {
      if (propStore.inherit && (!onlyChanged || propStore.changed)) {
        this.setPropertyValue(propName, propStore.value)
        this.setPropertyInheritance(propName, 1)
      }
    }
  }

  /**
   *
   * @param propName
   * @param value
   * @param equalityCheck {number} What type of equality check to perform against the current value, if any, to assess the changed value. 0 - no check, 1 - strict equals, 2 - deep equals
   * @param markChanged {boolean} Whether to actually mark the value as changed. In turn, if the property is a changed inheritable property, that will be noted
   * @returns {Props}
   */
  setPropertyValue (propName, value, equalityCheck=0, markChanged=true) {
    const store = this.createPropertyStore(propName)

    // Perform various equality checks
    if (equalityCheck === 1 && store.value === value) return value
    if (equalityCheck === 2 && deepEquals(store.value, value)) return value

    store.value = value
    store.changed = store.changed || markChanged

    if (markChanged) {
      this.hasChangedProperties = true
      if (store.inherit)
        this.hasChangedInheritableProperties = true
    }

    return value
  }

  setMultipleProperties (dictionary={}) {
    for (const [propName, propValue] of Object.entries(dictionary)) {
      this.setPropertyValue(propName, propValue)
    }

    return this
  }

  configureProperty (propName, opts={}) {
    const store = this.getPropertyStore(propName)

    if (opts.inherit !== undefined) {
      store.inherit = opts.inherit
    }
  }

  configureProperties (propNames, opts={}) {
    for (const propName of propNames)
      this.configureProperty(propName, opts)
  }

  setPropertyInheritance (propName, inheritance=0) {
    const store = this.createPropertyStore(propName)

    store.inherit = inheritance

    if (store.changed && inheritance)
      this.hasChangedInheritableProperties = true
  }

  getPropertyValue (propName) {
    return this.getPropertyStore(propName)?.value
  }

  getPropertyValues (propNameList) {
    return propNameList.map(propName => this.getPropertyValue(propName))
  }

  forEachStore (callback) {
    for (let key in this.store) {
      callback(this.store[key])
    }
  }

  forEachProperty (callback) {
    for (let key in this.store) {
      callback(key, this.store[key])
    }
  }

  markUpdated () {
    this.hasChangedProperties = false
    this.hasChangedInheritableProperties = false

    this.forEachStore(store => {
      store.changed = false
    })
  }

  markAllAsChanged () {
    this.hasChangedProperties = false
    this.hasChangedInheritableProperties = false

    this.forEachStore(store => {
      store.changed = true

      this.hasChangedProperties = true
      if (store.inherit) this.hasChangedInheritableProperties = true
    })
  }

  stringify () {
    console.log(JSON.stringify(this, null, 4))
  }
}
