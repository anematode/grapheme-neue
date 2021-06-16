import {Element} from "../core/element.js"

const imageInterface = {
  img: true,

}

export class ImageElement extends Element {
  constructor (params) {
    super(params)
  }

  computeProps () {
    const { props } = this

    this.defaultInheritProps()
  }

}
