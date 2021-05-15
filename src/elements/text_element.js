
import {Element} from "../core/element"
import {Vec2} from "../math/vec/vec2"
import {constructInterface} from "../core/interface"

const textElementInterface = constructInterface({
  font: true,
  fontSize: true,
  text: true,
  align: true,
  baseline: true,
  position: { conversion: Vec2.fromObj }
})

/**
 * Let's try designing a relatively clean element. Won't be SUPER lightweight because that'll be reserved for primitives
 * later. We'll also see how inheriting styles from the parent might work
 */
export class TextElement extends Element {
  constructor (params={}) {
    super(params)

    // Defaults, may change how this works later
    this.set({
      font: "Cambria",
      fontSize: 50,
      text: "Text",
      align: "center", // top, center, bottom
      baseline: "center", // top, center, bottom
      position: new Vec2(100, 200)
    })
  }

  getInterface () {
    return textElementInterface
  }

  getRenderingInstructions () {
    const { font, fontSize, text, position, align, baseline } = this.props.proxy

    return { type: "text", text: text, font: `${fontSize}px ${font}`, x: position.x, y: position.y, align, baseline }
  }
}
