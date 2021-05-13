
import {Element} from "../core/element"
import {TextStyle} from "../other/text_style"
import {Vec2} from "../math/vec/vec2"

/**
 * Let's try designing a relatively clean element. Won't be super lightweight because that'll be reserved for primitives
 * later. We'll also see how inheriting styles from the parent might work
 */
export class TextElement extends Element {
  constructor (params={}) {
    super(params)

    this.set({
      font: "Cambria",
      fontSize: 50,
      text: "Text",
      align: "center", // top, center, bottom
      baseline: "center", // top, center, bottom
      position: new Vec2(100, 200)
    })
  }

  _set (propName, value) {
    this.props.setPropertyValue(propName, value)
  }

  getRenderingInstructions () {
    const { font, fontSize, text, position, align, baseline } = this.props.proxy

    return { type: "text", text: text, font: `${fontSize}px ${font}`, x: position.x, y: position.y, align, baseline }
  }
}
