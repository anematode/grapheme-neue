
// The things that would get messed up when using objects as dictionaries, things like __proto__, prototype
const BANNED_PROP_NAMES = Object.getOwnPropertyNames(Object.getPrototypeOf({}))
BANNED_PROP_NAMES.push("")

export const isPropNameBanned = name => BANNED_PROP_NAMES.includes(name)
export const checkPropNameBanned = name => {
  if (isPropNameBanned(name)) throw new Error(name + " cannot be used as an identifier because it conflicts with the Object prototype")
}

/**
 * A base class to use for event listeners and the like. Supports things like addEventListener(eventName, callback),
 * triggerEvent(name, ?data), removeEventListener( ... ), removeEventListeners(?name). Listeners are called with
 * data and this as parameters. If a listener returns true, the event does not propagate to any other listeners.
 */
export class Eventful {
  /**
   * Internal variable containing a map of strings (event names) to arrays of handlers.
   * @type {Object}
   */
  eventListeners = {}

  /**
   * Register an event listener to a given event name. It will be given lower priority than the ones that came before.
   * The callbacks will be given a single parameter "data".
   * @param eventName {string} The name of the event
   * @param callback {function|Array} The callback(s) to register
   * @returns {Eventful} Returns self (for chaining)
   */
  addEventListener (eventName, callback) {
    checkPropNameBanned(eventName)

    if (Array.isArray(callback)) {
      for (const c of callback) this.addEventListener(eventName, c)

      return this
    } else if (typeof callback === "function") {
      if (typeof eventName !== "string" || !eventName) throw new TypeError("Invalid event name")

      let listeners = this.eventListeners[eventName]

      if (!listeners) {
        listeners = []
        this.eventListeners[eventName] = listeners
      }

      if (!listeners.includes(callback)) listeners.push(callback)
      return this
    } else throw new TypeError("Invalid callback")
  }

  /**
   * Get the event listeners under "eventName", cloned so that they can be derped around with
   * @param eventName {string} Name of the event whose listeners we want
   * @returns {Array<function>}
   */
  getEventListeners (eventName) {
    const listeners = this.eventListeners[eventName]

    return Array.isArray(listeners) ? listeners.slice() : []
  }

  /**
   * Whether there are any event listeners registered for the given name
   * @param eventName
   * @returns {boolean} Whether any listeners are registered for that event
   */
  hasEventListenersFor (eventName) {
    return Array.isArray(this.eventListeners[eventName])
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

    const listeners = this.eventListeners[eventName]

    if (Array.isArray(listeners)) {
      const index = listeners.indexOf(callback)

      if (index !== -1) listeners.splice(index, 1)

      if (listeners.length === 0) delete this.eventListeners[eventName]
    }

    return this
  }

  /**
   * Remove all event listeners for a given event. Fails silently if there are no listeners registered for that event.
   * @param eventName {string} The name of the event whose listeners should be cleared
   * @returns {Eventful} Returns self (for chaining)
   */
  removeEventListeners (eventName) {
    delete this.eventListeners[eventName]
    return this
  }

  /**
   * Trigger the listeners registered under an event name, passing (data, this, eventName) to each. Returns true if
   * some listener returned true, stopping propagation; returns false otherwise
   * @param eventName {string} Name of the event to be triggered
   * @param data {any} Optional data parameter to be passed to listeners
   * @returns {boolean} Whether any listener stopped propagation
   */
  triggerEvent (eventName, data) {
    const listeners = this.eventListeners[eventName]

    if (Array.isArray(listeners)) {
      for (let i = 0; i < listeners.length; ++i) {
        if (listeners[i](data, this, eventName)) return true
      }
    }

    return false
  }
}
