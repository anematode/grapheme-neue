import {Scene} from "./scene"
import {constructInterface} from "./interface"

const interactiveSceneInterface = constructInterface({
  ...Scene.prototype.getInterface().description,

  "interactivity": { onSet: function (value) { this._interactivityEnabled(value) }},

  // When width and height are set we want to immediately adjust the size of the canvas
  "width": { onSet: function () { this.resizeCanvas() } },
  "height": { onSet: function () { this.resizeCanvas() } }
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
  }

  /**
   * Attach interactivity listeners onto this.domElement, assuming that no listeners are already present. We convert
   * most events into a reduced form and report the (x, y) coordinates relative to the top-left of the canvas.
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
    this.domElement.width = this.width
    this.domElement.height = this.height
  }
}
