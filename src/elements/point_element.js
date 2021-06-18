import {Element} from "../core/element.js"
import {generateCircleTriangleStrip} from "../algorithm/misc_geometry.js"
import {constructInterface} from "../core/interface.js"
import {Vec2} from "../math/vec/vec2.js"
import {Colors} from "../styles/definitions.js"

const pointInterface = constructInterface({
  interface: {
    position: {
      description: "Position of the point, potentially under a plot transformation",
      conversion: {type: "vec2"},
      target: "pos"
    },
    color: {
      description: "Color of the point",
      conversion: {type: "color"},
      setAs: "user"
    },
    size: {
      description: "Radius in pixels of the dot",
      typecheck: {type: "number", min: 0, max: 100},
      setAs: "user"
    }
  }, internal: {
    pos: {type: "vec2", computed: "none" /* No defaults, no user value, no nothing */},
    color: {type: "color", computed: "user", default: Colors.BLACK},
    size: {type: "number", computed: "user", default: 5}
  }
})

export class PointElement extends Element {
  getInterface() {
    return pointInterface
  }

  _update () {
    this.defaultComputeProps()

    const { pos, color, size } = this.props.proxy
    let circleVertices = generateCircleTriangleStrip(size, pos.x, pos.y)

    this.internal.renderInfo = { instructions: { type: "triangle_strip", color, vertices: circleVertices } }
  }
}