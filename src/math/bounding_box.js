import {Vec2} from "./vec/vec2"
import * as utils from "../core/utils"

/**
 * A bounding box. In general, we consider the bounding box to be in canvas coordinates, so that the "top" is -y and
 * the "bottom" is +y.
 */
export class BoundingBox {
  constructor (x=0, y=0, width=0, height=0) {
    this.x = x
    this.y = y
    this.w = width
    this.h = height
  }

  clone () {
    return new BoundingBox(this.x, this.y, this.w, this.h)
  }

  /**
   * Push in (or pull out) all the sides of the box by a given amount. Returns null if too far. So squishing
   * { x: 0, y: 0, w: 2, h: 2} by 1/2 will give { x: 0.5, y: 0.5, w: 1, h: 1 }
   * @param margin {number}
   */
  squish (margin=0) {
    const { x, y, w, h } = this

    if (2 * margin > w || 2 * margin > h)
      return null

    return new BoundingBox(x + margin, y + margin, w - 2 * margin, h - 2 * margin)
  }

  squishAsymmetrically (left=0, right=0, bottom=0, top=0, flipY=false) {
    const { x, y, w, h } = this

    if (2 * (left + right) > w || 2 * (bottom + top) > h) {
      return null
    }

    if (flipY) {
      let tmp = bottom
      bottom = top
      top = tmp
    }

    return new BoundingBox(x + left, y + top, w - (left + right), h - (top + bottom))
  }
}


const boundingBoxTransform = {
  X: (x, box1, box2, flipX) => {
    if (Array.isArray(x) || utils.isTypedArray(x)) {
      for (let i = 0; i < x.length; ++i) {
        let fractionAlong = (x[i] - box1.x) / box1.width

        if (flipX)
          fractionAlong = 1 - fractionAlong

        x[i] = fractionAlong * box2.width + box2.x
      }
      return x
    } else {
      return boundingBoxTransform.X([x], box1, box2, flipX)[0]
    }
  },
  Y: (y, box1, box2, flipY) => {
    if (Array.isArray(y) || utils.isTypedArray(y)) {
      for (let i = 0; i < y.length; ++i) {
        let fractionAlong = (y[i] - box1.y) / box1.height

        if (flipY)
          fractionAlong = 1 - fractionAlong

        y[i] = fractionAlong * box2.height + box2.y
      }
      return y
    } else {
      return boundingBoxTransform.Y([y], box1, box2, flipY)[0]
    }
  },
  XY: (xy, box1, box2, flipX, flipY) => {
    if (Array.isArray(xy) || utils.isTypedArray(x)) {
      for (let i = 0; i < xy.length; i += 2) {
        let fractionAlong = (xy[i] - box1.x) / box1.width

        if (flipX)
          fractionAlong = 1 - fractionAlong

        xy[i] = fractionAlong * box2.width + box2.x

        fractionAlong = (xy[i+1] - box1.y) / box1.height

        if (flipY)
          fractionAlong = 1 - fractionAlong

        xy[i+1] = fractionAlong * box2.height + box2.y
      }
      return xy
    } else {
      throw new Error("No")
    }
  },
  getReducedTransform(box1, box2, flipX, flipY) {
    let x_m = 1 / box1.width
    let x_b = - box1.x / box1.width

    if (flipX) {
      x_m *= -1
      x_b = 1 - x_b
    }

    x_m *= box2.width
    x_b *= box2.width
    x_b += box2.x

    let y_m = 1 / box1.height
    let y_b = - box1.y / box1.height

    if (flipY) {
      y_m *= -1
      y_b = 1 - y_b
    }

    y_m *= box2.height
    y_b *= box2.height
    y_b += box2.y

    return {x_m, x_b, y_m, y_b}
  }
}

export {boundingBoxTransform}

const EMPTY = new BoundingBox(new Vec2(0,0), 0, 0)

function intersectBoundingBoxes(box1, box2) {
  let x1 = Math.max(box1.x, box2.x)
  let y1 = Math.max(box1.y, box2.y)
  let x2 = Math.min(box1.x2, box2.x2)
  let y2 = Math.min(box1.y2, box2.y2)

  if (x2 < x1) {
    return EMPTY.clone()
  }

  if (y2 < y1) {
    return EMPTY.clone()
  }

  let width = x2 - x1
  let height = y2 - y1

  return new BoundingBox(new Vec2(x1, y1), width, height)
}

export {intersectBoundingBoxes}
