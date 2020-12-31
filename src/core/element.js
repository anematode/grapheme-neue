/**
 * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
 * DOM elements, being nestable and their behaviors being determined
 */

import {Eventful} from "./eventful"

/**
 * The element class.
 */
export class Element extends Eventful {
  constructor (params={}) {
    super()

    this.id = "hi"
  }

  /**
   *
   * @returns {string}
   */
  getTagName () {
    return "element"
  }
}
