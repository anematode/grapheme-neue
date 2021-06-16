import {Scene} from "./scene.js"
import {constructInterface} from "./interface.js"

const interactiveSceneInterface = constructInterface({
  ...Scene.prototype.getInterface().description,

  "interactivity": { onSet: function (value) { this._interactivityEnabled(value) }, typecheck: "boolean"},

  // When width and height are set we want to immediately adjust the size of the canvas
  "width": { onSet: function () { this.resizeCanvas() }, typecheck: "number" },
  "height": { onSet: function () { this.resizeCanvas() }, typecheck: "number" },
  "dpr": { onSet: function () { this.resizeCanvas() }, typecheck: "number" }
})

/**
 * A scene endowed with an actual DOM element.
 */
export class InteractiveScene extends Scene {
  init (params) {
    super.init(params)

    this.domElement = document.createElement("canvas")
    this.bitmapRenderer = this.domElement.getContext("bitmaprenderer")

    this.resizeCanvas()
    this.set({ dpr: window.devicePixelRatio, interactivity: true })
  }

  /**
   * Attach interactivity listeners onto this.domElement, assuming that no listeners are already present. We convert
   * most events into a reduced form and report the (x, y) coordinates relative to the top-left of the canvas.
   * @private
   */
  _attachInteractivityListeners () {
    const { internal } = this
    let listeners = internal.listeners = {}

    const getSceneCoords = (evt) => {
      let rect = this.domElement.getBoundingClientRect()
      return {x: evt.clientX - rect.x, y: evt.clientY - rect.y}
    }

    ;[ "mousedown", "mousemove", "mouseup", "wheel" ].forEach(eventName => {
      let listener
      if (eventName === "wheel") {
        listener = (evt) => {
          this.triggerEvent(eventName, { ... getSceneCoords(evt), deltaY: evt.deltaY })
          evt.preventDefault()
        }
      } else {
        listener = (evt) => {
          this.triggerEvent(eventName, getSceneCoords(evt))
          evt.preventDefault()
        }
      }

      this.domElement.addEventListener(eventName, listeners[eventName] = listener)
    })
  }

  /**
   * Remove interactivity listeners
   * @private
   */
  _detachInteractivityListeners () {
    Object.entries(this.internal.listeners).forEach(([evtName, listener]) => {
      this.domElement.removeEventListener(evtName, listener)
    })
  }

  _interactivityEnabled (value) {
    let hasListeners = this.internal.listeners && Object.keys(this.internal.listeners).length > 0

    if (value === hasListeners) return
    value ? this._attachInteractivityListeners() : this._detachInteractivityListeners()
  }

  _update () {
    super._update()

    this.resizeCanvas()
  }

  getInterface () {
    return interactiveSceneInterface
  }

  resizeCanvas () {
    const { width, height, dpr } = this.props.proxy
    const { domElement } = this

    domElement.width = width * dpr
    domElement.height = height * dpr

    domElement.style.width = width + 'px'
    domElement.style.height = height + 'px'
  }
}
