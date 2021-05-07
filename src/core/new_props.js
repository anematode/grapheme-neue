
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
 * The properties class stores an element's internal properties, in contrast to the user-facing properties, which are
 * effectively getters and setters. There are benefits and costs to this approach. One of the main benefits is an easier
 * API for the programmer to manipulate complex stylings and properties. Another benefit is the built-in ability to
 * track whether a value has changed and whether it should be passed on to child elements. It also provides a sort of
 * abstract concept where the properties are the definition of how a given object is *rendered*.
 *
 * The concept of "changed" is relatively simple: it is whether a property has changed since the last time the element
 * was fully updated, *or* when the property's change was dealt with in a way such that it is consistent that the
 * element has fully updated. In other words, it is *functionally* identical to the last time an element was fully
 * updated. That means that if a given array is mutated, its changed value must be set to true, because it is not
 * functionally identical, even though it is strictly equal. It also means that if a given bounding box is cloned, its
 */
export class Props {
  constructor (init) {
    /**
     * A key-object dictionary containing the values. The keys are the property names and the objects are of the form
     * { value, changed, ... some other metadata for the given property ... }. A map could have been used, but an object
     * provides some benefits, such as shape optimization.
     * @type {any}
     */
    this.store = Object.create(null)

    // Just for fun... not sure if I'll keep this. Makes programming a bit less painful
    this.proxy = new Proxy(this, proxyHandlers)

    // Stores whether any property has changed, and whether any inheritable property has changed. The latter is used
    // when a child element asks whether it needs to grab props.
    this.hasChangedProperties = false
    this.hasChangedInheritableProperties = false
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
    return this.hasChangedProperties && propList.some(prop => this.hasPropertyChanged(prop))
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
   * @param onlyChanged {boolean} Whether to only inherit those properties which have changed: true. This is usually set to false when elements are first added and all elements need to be inherited
   */
  inheritPropertiesFrom (props, onlyChanged=true) {
    // Early exit condition, where if no inheritable properties have changed, we need not do anything
    if (onlyChanged && !props.hasChangedInheritableProperties) return

    const otherStore = props.store

    // Iterate through the elements of the store and copy over the values. Note that the only inherited attributes
    // are the property's value and its inheritability.
    for (const [propName, propStore] of Object.entries(otherStore)) {
      if (propStore.inherit && (!onlyChanged || propStore.changed)) {
        this.setPropertyValue(propName, propStore.value)
        this.setPropertyInheritance(propName, 1)
      }
    }
  }

  /**
   * This function sets the value of a property. It is meant mostly for internal use. If prompted, it will check to see
   * whether the value given and the current value are strictly equal, or deeply equal, and if so, not mark the property
   * as changed. By default, this check is turned off, meaning all value assignments are marked as "changed".
   * @param propName {string} The name of the property
   * @param value {any} The value of the property
   * @param equalityCheck {number} What type of equality check to perform against the current value, if any, to assess the changed value. 0 - no check, 1 - strict equals, 2 - deep equals
   * @param markChanged {boolean} Whether to actually mark the value as changed. In turn, if the property is a changed inheritable property, that will be noted
   * @returns {any}
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

  markChanged (propName) {
    let store = this.getPropertyStore(propName)

    store.changed = true
    this.hasChangedProperties = true
    if (store.inherit) this.hasChangedInheritableProperties = true
  }

  markAllAsChanged () {
    this.hasChangedProperties = false
    this.hasChangedInheritableProperties = false

    this.forEachStore(store => this.markChanged(store))
  }

  stringify () {
    console.log(JSON.stringify(this, null, 4))
  }
}
