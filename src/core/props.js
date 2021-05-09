
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
 * A property that does not exist essentially has the value of undefined. Deleting a property is thus essentially
 * equivalent to setting its value to undefined, with some important caveats, because the property's changed status
 * must still be stored. Such "undefined properties" are technical only and not inheritable or useable.
 *
 * Beyond a simple property store, this object provides two paramount functionalities: changedness and inheritance.
 * The concept of "changed" is relatively simple: it is whether a property has changed since the last time the element
 * was fully updated, *or* when the property's change was dealt with in a way such that it is consistent that the
 * element has fully updated. In other words, it is *functionally* identical to the last time an element was fully
 * updated. That means that if a given array is mutated, its changed value must be set to true, because it is not
 * functionally identical, even though it is strictly equal. It also means that if a given bounding box is cloned, its
 * "changed" status may still be unchanged.
 *
 * There are some simple things we can do to avoid recomputations. For sceneDimensions, for example, its call to set its
 * value is marked with equalityCheck = 2, meaning a deep equals comparison. Thus if the same dimensions are computed,
 * it will not be marked as a change. Cached values may also be used if that's appropriate, but it is generally not
 * (overhead and code complexity).
 *
 * Inheritance is whether a property should be forwarded to an element's descendants, stored in the property store's
 * inherit property. An inherit value of 2 means that the property is owned by the current element; an inherit value of
 * 1 means that the property is being passed along from an element above the current one. For example, sceneDimensions
 * is an inheritable property of a top-level scene, and thus has { inherit: 2 } in the scene's property store, while
 * in a figure below that scene, it has { inherit: 1 }. Inheritable properties must be treated slightly differently than
 * normal properties because they have effects outside the current element, and influence other elements directly.
 * Ideally, all elements should know whether an inheritable property has changed, but it would be inefficient and
 * ultimately inelegant to propagate down inherited properties every time one was changed. Instead, the inheritance
 * chain occurs during an update; an element inherits the inheritable properties from above it. An element only looks
 * for inheritable properties if parent.props.hasChangedInheritableProperties is 1 or 2, or if the element's updateStage
 * is -1. The latter case is for when an element has just been added to a group, and thus needs all the group's
 * inherited properties, whether they are changed or not.
 *
 * Another special property of inherited properties is that their "changed/unchanged" status is supplemented by a simple
 * time-based versioning system, as are many other Grapheme components. Inheritable properties thus have a version
 * value of some integer n, where n is unique and assigned in order of when the property was last set. A given
 * value of a property is associated with a unique integer n. When inheriting properties from a parent, all inheritable
 * properties are traversed, and those properties whose version is greater than the version in the child will be
 * inherited (or if the child doesn't have the property at all). An inheritable property is thus "changed" to a given
 * element if its value is less than the element's own version value, which is assigned in a similar temporal fashion
 * immediately following that element's update completion. It provides an efficient way of dealing with the concept of
 * "changed" for a certain property, but across multiple elements.
 *
 * A given element may set its private properties' "changed" status to false as long as it is consistent, and the
 * element may set the changed values of any of its inheritable properties to false, *provided* they leave the value
 * of this.props.hasChangedInheritableProperties alone. That's because that value is checked by children if they are
 * wondering whether they need to inherit props, and even if a parent's job may be done, the children still need to
 * check in case their version values don't match up. hasChangedInheritableProperties is only set to 0 (er, only should
 * be set to 0, as there is no enforcement mechanism) by the scene, during a global update, which will ensure that
 * inherited properties do not need to be propagated down anywhere. The other thing is that if an element ever changes
 * one of its inheritable properties, all of its direct children's updateStages need to be set to 0/-1, since they need
 * to be recomputed. Note that this will not lead to much overhead, because inheritable properties are supposed to be
 * used sparingly, and because setting a child's updateStage to 0 would mean they would simply check if any inheritable
 * props have changed and any of their props have changed, which will often mean a couple boolean accesses (many
 * elements can just explicitly inherit a few values).
 *
 * It is perhaps instructive to consider how properties will work on an actual example. Let's take a scene with
 * width: 640, height: 320, and dpr: 1, all of which are *local* properties, with an inheritance value of 0. Also, take
 * a figure with margins: { left: 0, top: 0, ... }, another local property. Finally, let a function plot with
 * function: "x^2" and pen: "red" be a child of the figure.
 *
 * It's a simple scene, and as nothing has been updated yet, all elements' versions and updateStages are -1. Indeed,
 * the figure has no clue about its position on the scene, let alone the transformation of coordinates needed for the
 * function to be happy. All elements have their local, uninheritable properties and those only. All of those
 * properties, being set moments ago, have changed: true (think of it as, they're being changed from being undefined).
 *
 * When scene.updateAll() is called, it traverses the tree of elements, calling update() on each one. scene.update()
 * sees that its updateStage is not 100, and so calls scene._update(), which observes that "width", "height", and "dpr"
 * have changed. It thus computes an inheritable property called sceneDimensions, which is just an object containing
 * those three parameters in one inheritable bundle. This property's version is, say, 501. The scene also sets all
 * of the children's update stages to the minimum of 0 and their current stage, which means they all stay at -1.
 * The scene is now permitted to set its own "changed" values to false for local properties. hasChangedInheritable
 * Properties, however, remains at 2. (One nuance: it's at 2 when inherited properties have been added or deleted, and
 * at 1 when only their values have changed.) The scene's updateStage is now 100
 *
 * figure.update() is next in line. Seeing its updateStage is not 100, it calls figure._update(), which observes that
 * its updateStage is -1, and thus properties must be inherited. It does so, keeping the version of sceneDimensions and
 * setting its own hasChangedInheritableProperties to 2, along with setting all its children's update stages to 0/-1.
 * Its version of sceneDimensions has inherit: 1, not 2. It also calculates its plotting box and other things, creating
 * a new value called plotTransform, with inherit: 2! It also sets all the children's update stages to the minimum of
 * 0 and their current value, which leaves them at -1. Also, focus on the sceneDimensions has a copied version. The
 * changed value of sceneDimensions is only used by the figure; the children inheriting always look at the version. In
 * other words, the changed is local to the element.
 *
 * function.update() is the last. Seeing its updateStage is not 100, it calls function._update(), which observes that
 * its updateStage is -1, and thus all properties must be inherited. It does so, keeping the versions of sceneDimensions
 * and plotTransform, along with private changed values for those properties. Again, THE CHANGED VALUE OF THE PARENT'S
 * PROPERTY IS IRRELEVANT. All inheritable properties are checked and their changed values compared to the element's
 * current value.
 *
 * At this point, the remainder of scene.updateAll() goes through all elements and sets their props.hasChangedInheritabl
 * eProperties to 0, knowing that all elements have updated and no longer need to check their parents for changed
 * inheritable properties. Let this state of the scene be STATE 1, a fully updated scene.
 *
 * Beginning from STATE 1, suppose another function plot, called function2, is added to the figure. Its updateStage is
 * -1. Thus, when scene.updateAll() is called and it gets to function2.update(), it knows to ignore the fact that
 * figure.props.hasChangedInheritableProperties is 0, and inherit all properties anyway. It stores those properties'
 * versions as before. But in the future, when its updateStage is 0, it knows it can take the value of figure.props.
 * hasChangedInheritableProperties literally.
 *
 * Beginning from STATE 1, suppose the scene's private width property is set to 500. The sceneDimensions does not
 * immediately update, locally or across elements. During updating, the scene's update stage is 0, so it computes
 * sceneDimensions. Seeing that an inheritable property has changed, scene.props.hasChangedInheritableProperties is
 * set to 1 and the figure's updateStage is set to 0. In turn, when updating, the figure sees that the scene's
 * hasChangedInheritableProperties has changed, so it checks its version of sceneDimensions versus the scene's version.
 * Finding the former is less, it copies the new version and new value of sceneDimensions, then sets figure.props.
 * hasChangedInheritableProperties to 1, and sets function's updateStage to 0.
 *
 * Beginning from STATE 1, suppose the scene deletes sceneDimensions, setting its value to undefined and inherit to 0.
 * This operation sets the hasChangedInheritableProperties to 2 and all the children's update stages to 0. 2 means that
 * the actual types of inherited properties have changed. In this case, the child has to both inherit changed properties
 * AND delete the properties which it had inherited. The operation is similar; it sets its value to undefined and
 * inherit to 0, and its hasChangedInheritableProperties to 2. Other operations which set it to "2" are adding an
 * inheritable property and setting the inheritance of a property back to 0.
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
      store.inherit = opts.inherit ? 2 : 0
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
