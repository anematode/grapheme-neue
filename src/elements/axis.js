import {Element} from "../core/element.js"
import {constructInterface} from "../core/interface.js"

// An axis is relatively general. It simply abstracts the concept of a start and end and allows a bunch of other
// baubles like ticks, labels, etc. For now we'll just do text.

// Okay, let's use axis as a test for a more complex interface. For now, let's have the following properties:

// ticks: undefined or dictionary of places to put ticks (major: [ ... ], minor: [ ... ])
// tickStyles: dictionary of

const axisInterface = constructInterface({
  ticks: { setAs: "user", getAs: "real", setMerge: true },
  start: { conversion: "vec2" },
  end: { conversion: "vec2" },
  graphStart: true,
  graphEnd: true,
  axis: { destructuring: { start: "start", end: "end", graphStart: "graphStart", graphEnd: "graphEnd"} }
})

function convertTicks (ticks) {
  if (Array.isArray(ticks)) {
    return { major: ticks }
  } else {
    return ticks
  }
}

export class AxisElement extends Element {
  getInterface () {
    return axisInterface
  }

  init () {

  }

  _update () {
    const { props } = this

    if (props.hasChanged("ticks")) {
      // Compute ticks from user value
      let userValue = props.getUserValue("ticks")

      props.set("ticks", convertTicks(userValue), 0)
    }

    if (props.hasChanged("tickStyles")) {
      // Compute tick styles from user value
      let userValue = props.getUserValue("tickStyles")

      props.set("tickStyles")
    }

    if (props.haveChanged(["ticks", "tickStyles", "start", "end", "graphStart", "graphEnd"])) {
      const { start, end, graphStart, graphEnd, ticks, tickStyles } = props.proxy

      if ([ticks, start, end, graphStart, graphEnd].some(x => x === undefined)) return
      let instructions = this.internal.instructions = []

      for (const [style, positions] of Object.entries(ticks)) {
        console.log(style, positions)
      }

      instructions.push()
    }

  }

  getRenderingInstructions() {
    return this.internal.instructions
  }
}
