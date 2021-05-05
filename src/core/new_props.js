
// The general form of a prop store is { value: , changed: , userValue: , }

/**
 * test class meant for internal use
 */
export class Props {
  constructor () {
    this.store = Object.create(null)

    this.hasChangedProperties = false
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

  getPropertyList () {
    return Object.keys(this.store)
  }

  getPropertyStore (propName) {
    return this.store[propName]
  }

  setPropertyValue (propName, value, checkForEquality=false, markChanged=true) {
    const store = this.createPropertyStore(propName)

    if (checkForEquality && store.value === value) return this

    store.value = value
    store.changed = store.changed || markChanged

    if (store.changed) this.hasChangedProperties = true

    return this
  }

  setMultipleProperties (dictionary={}) {
    for (const [propName, propValue] of Object.entries(dictionary)) {
      this.setPropertyValue(propName, propValue)
    }
  }

  getPropertyValue (propName) {
    return this.getPropertyStore(propName)?.value
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

  markAllPropertiesAsChanged (changed=true) {
    this.forEachStore(store => store.changed = changed)

    this.hasChangedProperties = changed
  }

  stringify () {
    console.log(JSON.stringify(this, null, 4))
  }
}
