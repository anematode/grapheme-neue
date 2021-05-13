import {Scene} from "./scene"

/**
 * A scene endowed with an actual DOM element.
 */
export class InteractiveScene extends Scene {
  constructor (params={}) {
    super(params)

    this.domElement = document.createElement("canvas")
    this.bitmapRenderer = this.domElement.getContext("bitmaprenderer")
  }

  resizeCanvas () {
    this.domElement.width = this.width
    this.domElement.height = this.height
  }

  setSize (...args) {
    super.setSize(...args)
    this.resizeCanvas()
  }

  /**
   * Attach interactivity listeners onto this.domElement, assuming that no listeners are already present.
   * @private
   */
  _attachInteractivityListeners () {
    const { internal } = this
    let listeners = internal.listeners = {}

    ;[ "mousedown", "mousemove", "mouseup", "wheel" ].forEach(event => {
      let listener = listeners[event] = (evt) => {
        let rect = this.domElement.getBoundingClientRect()
        let x = evt.pageX - rect.x
        let y = evt.pageY - rect.y

        this.triggerEvent(event, { x, y })
      }

      this.domElement.addEventListener(event, listener)
    })
  }

  _detachInteractivityListeners () {
    Object.entries(this.internal.listeners).forEach(([evtName, listener]) => {
      this.domElement.removeEventListener(evtName, listener)
    })
  }

  interactivityEnabled (value) {
    let hasListeners = this.internal.listeners && Object.keys(this.internal.listeners).length > 0

    if (value === hasListeners) return
    value ? this._attachInteractivityListeners() : this._detachInteractivityListeners()
  }

  _set (propName, value) {
    switch (propName) {
      case "interactivity":
        this.interactivityEnabled(value)
    }

    super._set(propName, value)
  }
}
