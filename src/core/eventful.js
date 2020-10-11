/**
 * A base class to use for event listeners and the like. Supports things like addEventListener(eventName, callback),
 * triggerEvent(name, ?data), removeEventListener( ... ), removeEventListeners(?name). Listeners are called with
 * "data" as a single parameter. If the listener returns "true", the event does not propagate to any other listeners.
 * If a field "children" is found in this class,
 */
export class Eventful {
  #eventListeners = new Map()

  addEventListener (eventName, callback) {
    const listeners = this.#eventListeners


  }

  getEventListeners (eventName) {
    return eventName ? this.#eventListeners[eventName] : this.#eventListeners
  }
}
