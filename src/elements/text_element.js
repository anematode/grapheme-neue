
import {Element} from "../core/element"
import {Vec2} from "../math/vec/vec2"
import {constructInterface} from "../core/interface"
import { Colors } from "../styles/definitions"

const textElementInterface = constructInterface({
  font: true,
  fontSize: true,
  text: true,
  align: true,
  baseline: true,
  color: true,
  shadowRadius: true,
  shadowColor: true,
  position: { conversion: Vec2.fromObj }
})

// Okay so, text is defined by a font, a font size, a horizontal alignment, a baseline, a position, a color, a shadow
// radius, a shadow color, and the string itself. A text instruction is then
// { type: "text", text: (str), fontSize?: (number, default 12), font?: (str, default "serif"), x: (number), y: (number),
// align?: (str, default "left"), baseline?: (str, default "top"), color?: (Color, default BLACK), shadowRadius?:
// (number, default 0), shadowColor?: (Color, default WHITE) }. The bounding box of a piece of text is dependent on many
// of these factors. In general, it is the bounding box of the piece of text without a shadow, expanded outwards by the
// shadow radius.

/**
 * Let's try designing a relatively clean element. Won't be SUPER lightweight because that'll be reserved for primitives
 * later.
 */
export class TextElement extends Element {
  init (params) {
    this.set({
      font: "Cambria",
      fontSize: 50,
      text: "Text",
      align: "center", // top, center, bottom
      baseline: "center", // top, center, bottom
      position: new Vec2(100, 200),
      color: Colors.BLACK,
      shadowRadius: 8,
      shadowColor: Colors.WHITE
    })
  }

  getInterface () {
    return textElementInterface
  }

  _update () {


  }

  getRenderingInstructions () {
    const { font, fontSize, text, position, align, baseline, color, shadowRadius, shadowColor } = this.props.proxy

    return { type: "text", text: text, fontSize, font, x: position.x, y: position.y, align, baseline, color, shadowRadius, shadowColor }
  }
}
