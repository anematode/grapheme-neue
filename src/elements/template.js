import {Element} from "../core/element"


class Cow extends Element {
  constructor (params) {
    super(params)
  }

  _set (propName, value) {

  }

  computeProps () {
    const { props } = this

    this.defaultInheritProps()
  }

  update () {
    if (this.updateStage === 100) return



    this.updateStage = 100
  }
}
