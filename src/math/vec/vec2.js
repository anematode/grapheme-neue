/**
 * @file This file describes a {@link Vec2} class. It is intended to be lightweight and mainly for internal use.
 */

/**
 * A 2D vector consisting of two floating-point numbers x and y.
 */
class Vec2 {
  /**
   * Construct a Vec2. Because this operation is incredibly frequent, the constructor is simple. There are special
   * static class functions for constructing a vector, or setting a vector, from other forms.
   * @param x {number} The x component of the vector
   * @param y {number} The y component of the vector
   */
  constructor (x, y) {
    this.x = x
    this.y = y
  }
}

export { Vec2 }
