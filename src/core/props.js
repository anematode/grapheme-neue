/**
 * The following interface is basically a key -> object dict, with some additional features. First, each property is
 * associated with a "prop store" that includes the property value, whether it has changed since the last time it was
 * marked as processed, and potentially other info, like whether it should be inherited.
 *
 * Any accesses to a nonexistent property return undefined, and no property can have value undefined -- that's basically
 * the way such properties are treated. When a property is removed with .delete(name), however, the underlying
 * propStore is not immediately deleted; instead, the propStore has its value replaced with undefined, and its changed
 * value set to true, since the property has changed value, and must be processed appropriately before marking it as
 * not changed and deleting the store. With regards to any particular propName, an ElementProps object can 1. "have a
 * property propName with value propValue", 2. "be undefined", or 3. "be undefined AND have a propStore indicating its
 * value has changed."
 *
 * The meaning of whether a value has "changed" can be a bit hard to understand, not least because the same ElementProps object is used
 * for the element's defined properties and for its computed properties. In simplest terms, it represents that the
 * changed property must be processed when the element is updated. Take the example of a simple polyline, with given
 * vertices [v1, v2, ..., vn] as an array of Vec2s. Most of the polyline code prefers vertices in a canonical form
 * [x1, y1, x2, y2, ..., xn, yn]. To prepare the polyline to be rendered, we need to provide the renderer with a
 * triangulation of the polyline's "thick" image. The triangulation is not only dependent on the vertices, but the
 * polyline's pen -- which defines things like line thickness, color, and presence of dashes.
 *
 * At element creation, all properties have changed: true, since they must all be processed; when adding an element to a
 * parent, it must inherit all the parent's properties as if they had changed: true. The inheritance algorithm is
 * simple: a parent may have computed properties with inherit: 1, which should be propagated down to all children
 * (regardless of whether they actually use the value). Examples of inherited properties include sceneDims (top-level
 * size of the scene), plotTransform, plotBoundingBox. The actual implementation of inheritance is left to the elements;
 * they could implement custom inheritance operations, or simply discard the inherited value.
 *
 * The obvious questions are: 1. why use a custom prop system like this? Why not just use static properties?
 * and 2. why use inheritance? Why not just tell each graph the plot and the scene it's in? Isn't that enough? Aren't
 * you massively overcomplicating things?
 *
 * 1) A custom prop system allows us to keep track of whether certain values have changed. It'd be foolish to not store
 * this information, and just recompute everything on each update. A single "needsUpdate" status could work, but still
 * discards a lot of information. As we'll see, knowing that only a few parameters have changed can be very useful,
 * especially with more aggressive caching, making updating significantly faster.
 *
 * 2) It's complicated, yes, but inheritance has multiple benefits. First, it allows us to keep track of changes which
 * can be optimized for in various implementations. Instead of changing the plot x transform and telling all the plots
 * "oh, something has changed, go figure it out for yourself", we can just tell it that the x transform has changed.
 * There is some cost for inheritance, of course, and in many cases the same benefit can be done via caching—which is
 * what will hopefully be done in *most* implementations.
 *
 * Suppose we change the vertices attribute, marking its property in the props object as "changed: true". (Note that if
 * we mutate the vertices array by ourselves, we have to manually mark it as changed.)
 */
export class ElementProps {
  constructor () {
    this.store = new Map()

    this.needsUpdate = true
  }

  delete (propName) {
    this._set(propName, undefined)

    return this
  }

  /**
   * Given a callback, call the callback with (propName, propStore) for every element, except deleted elements (though
   * those are included if includeDeletedProps is true
   * @param callback {function}
   * @param includeDeletedProps {boolean}
   */
  forEach (callback, includeDeletedProps=false) {
    for (const [propName, propStore] of this.store.entries()) {
      if (!includeDeletedProps && propStore.value === undefined) continue
      callback(propName, propStore)
    }
  }

  /**
   * Given a callback, call the callback with (propName, propStore) for every property which has changed: true, except
   * deleted elements (which are included if includeDeletedProps is true)
   * @param callback
   * @param includeDeletedProps
   */
  forEachChanged (callback, includeDeletedProps=true) {
    for (const [propName, propStore] of this.store.entries()) {
      if (!includeDeletedProps && propStore.value === undefined) continue
      callback(propName, propStore)
    }
  }

  /**
   * Get the value of a property, returning undefined if it does not exist.
   * @param propName
   * @returns {undefined}
   */
  get (propName) {
    const propStore = this.store.get(propName)

    return propStore ? propStore.value : undefined
  }

  // Gets the prop store of an element
  getPropStore (propName, createIfUndef=false) {
    let propStore = this.store.get(propName)

    if (!propStore && createIfUndef) {
      propStore = { value: undefined, changed: true }
      this.store.set(propName, propStore)
    }

    return propStore
  }

  has (propName) {
    return this.get(propName) === undefined
  }

  hasChanged (propName) {
    if (Array.isArray(propName)) {
      for (let i = 0; i < propName.length; ++i) {
        if (this.store.get(propName[i])?.changed) return true
      }
      return false
    } else {
      return this.store.get(propName)?.changed
    }
  }

  markAllChanged (changed=true) {
    for (const [propName, propStore] of this.store.entries()) {
      propStore.changed = changed

      if (!changed && propStore.value === undefined) this.store.delete(propName)
    }
  }

  markChanged (propName, changed=true) {
    const propStore = this.store.get(propName)

    if (!propStore) {
      if (changed) this.set(propName, undefined) // TODO
    } else {
      propStore.changed = changed
    }

    this.needsUpdate = true
  }

  // Remove property stores that are undefined and have changed: false
  removeUnused () {
    for (const [propName, propStore] of this.store.entries()) {
      if (propStore.value === undefined && propStore.changed) this.store.delete(propName)
    }
  }

  _set (propName, value, config) {
    const store = this.store
    let propStore = store.get(propName)

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
        propStore = { value, changed: true };
        store.set(propName, propStore)
      }

      if (config?.inherit !== undefined) {
        propStore.inherit = config.inherit
      }
    }

    this.needsUpdate = true
  }

  set (propName, value, config) {
    if (typeof propName === "object") { // Overloaded function; can be called as set  ( key, value ) or set (dict)

      for (const [key, val] of Object.entries(propName))
        this._set(key, val, config)

      return this
    } else if (typeof propName !== "string")
      throw new TypeError("Element property name must be a string.")

    this._set(propName, value, config)

    return this
  }

  toJSON (byValue=true) {
    const ret = {}

    this.forEach((name, propStore) => ret[name] = byValue ? propStore.value : propStore, true)

    return ret
  }
}


// Functions describing more complex prop store operations.

/**
 * Returns true if there were props to inherit
 * @param targetProps
 * @param baseProps
 * @returns {boolean}
 * @private
 */
export function _inheritChangedInheritablePropsFromBase (targetProps, baseProps) {
  let propsFound = false

  for (const [propName, propStore] of baseProps.store.entries()) {
    if (propStore.inherit && propStore.changed) {
      targetProps.store.set(propName, { ... propStore })
      propsFound = true
    }
  }

  return propsFound
}

export function _inheritAllInheritablePropsFromBase (targetProps, baseProps) {
  let propsFound = false

  for (const [propName, propStore] of baseProps.store.entries()) {
    if (propStore.inherit) {
      targetProps.store.set(propName, { inherit: true, changed: true, value: propStore.value })
      propsFound = true
    }
  }

  return propsFound
}

export function _inheritAllChangedPropsFromBase (targetProps, baseProps) {
  for (const [propName, propStore] of baseProps.store.entries()) {
    if (propStore.changed) {
      targetProps.store.set(propName, { ... propStore })
    }
  }
}

export function _inheritAllPropsFromBase (targetProps, baseProps) {
  for (const [propName, propStore] of baseProps.store.entries()) {
    targetProps.store.set(propName, { inherit: propStore.inherit, changed: true, value: propStore.value })
  }
}

export function _forwardPropsByNameDict (targetProps, baseProps, aliases, forwardChangedValue=true) {
  throw ""
  for (const [propName, propStore] of baseProps) {
    if (forwardChangedValue && !propStore.changed) continue

    const targetPropName = aliases[propName]

    if (targetPropName) {
      targetProps.store.set(targetPropName, { value: propStore.value, inherit: propStore.inherit, })
    }
  }
}

/**
 * Copy changed properties from base props into target props
 * @param targetProps
 * @param baseProps
 * @param propNames
 * @private
 */
export function _forwardChangedProps (targetProps, baseProps, propNames) {
  const baseStore = baseProps.store
  const targetStore = targetProps.store

  if (propNames) {
    for (const propName of propNames) {
      const propStore = baseStore.get(propName)

      if (propStore.changed) {
        targetStore.set(propName, { value: propStore.value, changed: true, inherit: propStore.inherit })
      }
    }
  } else {
    for (const [propName, propStore] of baseStore.entries()) {
      if (propStore.changed) {
        targetStore.set(propName, { value: propStore.value, changed: true, inherit: propStore.inherit })
      }
    }
  }
}
