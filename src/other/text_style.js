
// General style for text; some will be special maybe
import {Colors} from "./color"

export class TextStyle {
  constructor (params={}) {
    this.color = params.color ?? Colors.BLACK
    this.font = params.font ?? "Cambria"
    this.fontSize = params.fontSize ?? 12
  }
}
