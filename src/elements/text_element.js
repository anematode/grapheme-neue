
import {Element} from "../core/element.js"
import {Vec2} from "../math/vec/vec2.js"
import {constructInterface} from "../core/interface.js"
import { Colors } from "../styles/definitions.js"

const textElementInterface = constructInterface({
  font: { setAs: "user" },
  fontSize: { setAs: "user" },
  text: true,
  align: { setAs: "user" },
  baseline: { setAs: "user" },
  color: { setAs: "user" },
  shadowRadius: { setAs: "user" },
  shadowColor: { setAs: "user" },
  position: { conversion: Vec2.fromObj }
})

// Okay so, text is defined by a font, a font size, a horizontal alignment, a baseline, a position, a color, a shadow
// radius, a shadow color, and the string itself. A text instruction is then
// { type: "text", text: (str), fontSize?: (number, default 12), font?: (str, default "serif"), x: (number), y: (number),
// align?: (str, default "left"), baseline?: (str, default "top"), color?: (Color, default BLACK), shadowRadius?:
// (number, default 0), shadowColor?: (Color, default WHITE) }. The bounding box of a piece of text is dependent on many
// of these factors. In general, it is the bounding box of the piece of text without a shadow, expanded outwards by the
// shadow radius.

const userDefaults = {
  "font": "Cambria",
  "fontSize": 10,
  "align": "left",
  "baseline": "top",
  "color": Colors.BLACK,
  "shadowRadius": 0,
  "shadowColor": Colors.WHITE
}

/**
 * Let's try designing a relatively clean element. Won't be SUPER lightweight because that'll be reserved for primitives
 * later.
 */
export class TextElement extends Element {
  init (params) {
    this.set(params)
  }

  getInterface () {
    return textElementInterface
  }

  computeProps () {
    this.forwardDefaults(userDefaults, "user")
  }

  _update () {
    this.computeProps()

    const { font, fontSize, text, position, align, baseline, color, shadowRadius, shadowColor } = this.props.proxy
    this.internal.renderInfo = {
      instructions: { type: "text", text: text, fontSize, font, anchor: position, align, baseline, color, shadowRadius, shadowColor }
    }

    this.props.markAllUpdated()
  }
}
