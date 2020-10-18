/**
 * A base class to use for event listeners and the like. Supports things like addEventListener(eventName, callback),
 * triggerEvent(name, ?data), removeEventListener( ... ), removeEventListeners(?name). Listeners are called with
 * data and this as parameters. If the listener returns true, the event does not propagate to any other listeners.
 * If a field "children" is found in this class, it will propagate the event to children. If a field
 * "triggerChildrenFirst" is found, its boolean value will determine whether this class's listeners are called first,
 * or its children's listeners are called. Children which are not instances of Eventful will not have their triggerEvent
 * method called.
 */
export class Eventful {
  /**
   * Internal variable containing a map of strings (event names) to arrays of handlers.
   * @type {Map<string, Array<function>>}
   */
  #eventListeners = new Map()

  /**
   * Register an event listener to a given event name. It will be given lower priority than the ones that came before.
   * The callbacks will be given a single parameter "data".
   * @param eventName {string} The name of the event
   * @param callback {function|Array} The callback(s) to register
   * @returns {Eventful} Returns self (for chaining)
   */
  addEventListener (eventName, callback) {
    if (Array.isArray(callback)) {
      for (const c of callback) this.addEventListener(eventName, c)

      return this
    } else if (typeof callback === "function") {
      if (typeof eventName !== "string" || !eventName) throw new TypeError("Invalid event name")

      let listeners = this.#eventListeners.get(eventName)

      if (!listeners) {
        listeners = []
        this.#eventListeners.set(eventName, listeners)
      }

      if (!listeners.includes(callback)) listeners.push(callback)
      return this
    } else throw new TypeError("Invalid callback")
  }

  /**
   * Get the event listeners under "eventName"
   * @param eventName {string} Name of the event whose listeners we want
   * @returns {Array<function>}
   */
  getEventListeners (eventName) {
    return this.#eventListeners.get(e)?.slice() ?? []
  }

  /**
   * Whether there are any event listeners registered for the given name
   * @param eventName
   * @returns {boolean} Whether any listeners are registered for that event
   */
  hasEventListenersFor (eventName) {
    return this.#eventListeners.has(eventName)
  }

  /**
   * Remove an event listener from the given event. Fails silently if that listener is not registered.
   * @param eventName {string} The name of the event
   * @param callback {function} The callback to remove
   * @returns {Eventful} Returns self (for chaining)
   */
  removeEventListener (eventName, callback) {
    if (Array.isArray(callback)) {
      for (const c of callback) this.removeEventListener(eventName, c)

      return this
    }

    const listeners = this.#eventListeners.get(eventName)

    if (listeners) {
      const index = listeners.indexOf(callback)

      if (index !== -1) listeners.splice(index, 1)
    }

    if (listeners.length === 0) this.#eventListeners.delete(eventName)
    return this
  }

  /**
   * Remove all event listeners for a given event. Fails silently if there are no listeners registered for that event.
   * @param eventName {string} The name of the event whose listeners should be cleared
   * @returns {Eventful} Returns self (for chaining)
   */
  removeEventListeners (eventName) {
    this.#eventListeners.delete(eventName)
    return this
  }

  /**
   * Trigger the listeners registered under an event name, passing (data, this, eventName) to each. Returns true if
   * some listener returned true, stopping propagation; returns false otherwise
   * @param eventName {string} Name of the event to be triggered
   * @param data {any} Optional data parameter to be passed to listeners
   * @param opts {Object} Extra options to dictate how the event is triggered
   * @returns {boolean} Whether any listener stopped propagation
   */
  triggerEvent (eventName, data, opts={}) {
    // Trigger only this element's listeners
    const triggerListeners = () => {
      const listeners = this.#eventListeners.get(eventName)

      if (listeners) {
        for (let i = 0; i < listeners.length; ++i) {
          if (listeners[i](data, this, eventName)) return true
        }
      }

      return false
    }

    // Trigger all the children
    const triggerChildren = () => {
      const { children } = this

      if (children.length === 0) return false

      for (let i = 0; i < children.length; ++i) {
        const child = children[i]

        if (child.triggerEvent) {
          if (child.triggerEvent(eventName, data))
            return true
        }
      }

      return false
    }

    // For Eventfuls with children
    if (this.children) {
      const triggerChildrenFirst = !!this.triggerChildrenFirst

      if (triggerChildrenFirst) {
        if (triggerChildren()) return true
      }

      if (triggerListeners()) return true

      if (!triggerChildrenFirst) {
        if (triggerChildren()) return true
      }
    } else {
      // Other case
      if (triggerListeners()) return true
    }

    return false
  }
}
