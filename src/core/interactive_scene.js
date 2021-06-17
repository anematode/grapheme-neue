import {Scene} from "./scene.js"
import {constructInterface} from "./interface.js"
import {deepClone} from "./utils.js"

let sceneInterface = Scene.prototype.getInterface()

let interactiveSceneInterface = {
  interface: {
    ...sceneInterface.description.interface,
    interactivity: {typecheck: {type: "boolean"}}
  },
  internal: {
    ...sceneInterface.description.internal,
    interactivity: {type: "boolean", computed: "none", default: true}
  }
}


interactiveSceneInterface = constructInterface(interactiveSceneInterface)

/**
 * A scene endowed with an actual DOM element.
 */
export class InteractiveScene extends Scene {
  init (params) {
    super.init(params)

    this.domElement = document.createElement("canvas")
    this.bitmapRenderer = this.domElement.getContext("bitmaprenderer")
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
    value = !!value
    let hasListeners = this.internal.listeners && Object.keys(this.internal.listeners).length > 0

    if (value === hasListeners) return
    value ? this._attachInteractivityListeners() : this._detachInteractivityListeners()
  }

  _update () {
    super._update()

    const props = this.props

    if (props.hasChanged("interactivity")) {
      console.log("hi")
      this._interactivityEnabled(props.get("interactivity"))
    }

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
