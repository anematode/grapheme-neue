import { Element } from "./element.js"

/**
 * Element living in a Plot2D, as opposed to a hypothetical Element3D.
 */
export class Element2D extends Element {
  constructor (params={}) {
    super(params)
  }

  /**
   * Returns whether the given element may be added to this element as a child; stricter than the default for elements
   * @param element {Element}
   * @returns {boolean}
   * @private
   */
  _isValidChild (element) {
    return (element instanceof Element2D) && !element.parent && !element.isPlot()
  }
}
