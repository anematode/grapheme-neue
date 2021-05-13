

// Defines an interface between a user-facing getter/setter and the internal properties of an element. There is not a
// one-to-one correspondence between the user-facing "properties" and the actual underlying properties. In fact, some
// operations by the user may be no-ops while others may fail silently, and still others may throw an error when
// appropriate. The programmer can adjust this behavior by defining the _set and get functions. But using a bunch of if
// statements is generally clunky and not very expressive. Thus, we define for most elements an INTERFACE, an easier way
// to abstract this getter/setter system.

// A natural question is: why do you have such a system? Wouldn't this make property accesses unbearably slow? Well, the
// user generally isn't supposed to make a ridiculous amount of elements. Plus, most of Grapheme's time is spent in the
// update function, which should be optimized first. If the property system turns out to be a serious drag, then I'll
// find a workaround. But even just for me, having this kind of system would help with catching my own errors.

import {Vec2} from "../math/vec/vec2"

export const SampleInterface = {
  // Define behavior of set(width, value) and get(width). If empty, it directly modifies the property with the same name.
  "width": true, "marginLeft": true, "marginRight": true, "marginBottom": true, "marginTop": true,
  // set(h, value) and get(sceneHeight, value) will have the same behavior as using "height"
  "height": { aliases: ['h', 'sceneHeight'] },
  // The position value is converted from whatever the user inputted into a Vec2 before setting the internal property
  "position": { conversion: Vec2.fromObj },
  // A different internal property name than the property name
  "length": { target: "axisLength" },
  // or
  "_length": "axisLength",
  // Destructuring: mapping an object into multiple internal properties, and reconstructing it the same way
  "margins": { destructuring: { left: "marginLeft", right: "marginRight", bottom: "marginBottom", top: "marginTop"} },
  // Read and write only
  "sceneDimensions": { readOnly: true }
}

function invertDestructure (obj) {
  let ret = {}

  for (let key in obj) {
    ret[obj[key]] = key
  }

  return ret
}

export function constructInterface (interfaceDescription) {
  // We basically need to construct a set(element, name, value) and get(element, name, value) function. That's about it.
  // The gist of it is we just have a list of actions associated with each property's get and set operation. So we have
  // two lists: one for setting and one for getting. For setting properties that match names with the internal, that's
  // the simplest; we store propName: true. Then for properties which have a different target, we store the string
  // "target".

  const setters = {}
  const getters = {}

  for (const [ propName, description ] of Object.entries(interfaceDescription)) {
    if (typeof description === "string") {
      // Simply map propName to the given targetName
      setters[propName] = getters[propName] = description
    } else if (typeof description === "object") {
      let { aliases, conversion, target, destructuring, readOnly, writeOnly } = description

      if (readOnly && writeOnly) continue // lol
      let needsSetter = !readOnly
      let needsGetter = !writeOnly

      if (aliases) {
        for (const alias of Array.from(aliases)) {
          needsSetter ? setters[propName] = target : 0
          needsGetter ? getters[propName] = target : 0
        }
      }

      // First convert, then destructure, then target
      if (needsSetter) {
        const steps = []

        if (conversion) steps.push({ type: "conversion", conversion })
        if (destructuring) steps.push({ type: "destructuring", destructuring })
        if (target) steps.push(target)

        if (steps.length === 0) setters[propName] = true
        else if (steps.length === 1) setters[propName] = steps[0]
        else setters[propName] = steps
      }

      // First target, then destructure
      if (needsGetter) {
        const steps = []

        if (target) steps.push(target)
        if (destructuring) steps.push({ type: "restructuring", restructuring: invertDestructure(destructuring) })

        if (steps.length === 0) getters[propName] = true
        else if (steps.length === 1) getters[propName] = steps[0]
        else getters[propName] = steps
      }
    } else {
      // Map directly to the same property name
      setters[propName] = getters[propName] = true
    }
  }

  return {
    set: (element, name, value) => {
      const steps = setters[name]
      if (typeof steps === "boolean") element.props.setPropertyValue(name, value)
      else if (typeof steps === "string") element.props.setPropertyValue(steps, value)
      else {
        let target = name

        for (const step of steps) {
          if (typeof step === "string") {
            target = step
            break
          } else {
            if (step.type === "destructuring") {

            }
          }
        }

        element.props.setPropertyValue(target, value)
      }
    },
    get: (element, name, value) => {

    },
    setters,
    getters
  }
}
