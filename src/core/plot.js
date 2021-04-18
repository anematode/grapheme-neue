import {Group} from "./group"
import {BoundingBox} from "../math/bounding_box"


class Plot2D extends Group {
  constructor (params) {
    super(params)

    this.set("bounding_box", new BoundingBox(0, 0, 640, 480))
  }

  update (stage) {
    // We forward props that have changed, then mark all the props as done.

    if (this.updateStage)
    if (this.updateStage === 2 && !this.props.needsUpdate) return
    this.updateStage = 0

    if (this.props.hasChanged("bounding_box"))
      this.computedProps.set("plot_bounding_box", this.get("bounding_box") ?? new BoundingBox(0, 0, 640, 480))

    this.updateStage = 1


  }
}
