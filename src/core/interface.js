

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

import {Vec2} from "../math/vec/vec2.js"
import {flattenVec2Array} from "../algorithm/misc_geometry.js"

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
    let invertedKey = obj[key]
    let isIdentity = typeof invertedKey === "boolean"

    if (isIdentity) {
      invertedKey = key
      key = true
    }

    ret[invertedKey] = key
  }

  return ret
}

const builtinTypechecks = {
  string: x => {
    if (typeof x === "string") return true
    else return "Expected string"
  },
  number: x => {
    if (typeof x === "number") return true
    else return "Expected number"
  },
  boolean: x => {
    if (typeof x === "boolean") return true
    else return "Expected boolean"
  }
}

const builtinConversions = {
  vec2_array: arr => {
    return flattenVec2Array(arr)
  },
  vec2: Vec2.fromObj
}

function createTypecheck (description) {
  if (typeof description === "function") {
    return description
  } else if (typeof description === "string") {
    const typecheck = builtinTypechecks[description]

    return typecheck
  } else if (typeof description === "object") {

  }
}

function createConversion (description) {
  if (typeof description === "function") {
    return description
  } else if (typeof description === "string") {
    const conversion = builtinConversions[description]

    return conversion
  }
}

const reservedPropNames = [ "id", "updateStage" ]

export function constructInterface (interfaceDescription) {
  // We basically need to construct a set(element, name, value) and get(element, name) function. That's about it.
  // The gist of it is we just have a list of actions associated with each property's get and set operation. So we have
  // two lists: one for setting and one for getting. For setting properties that match names with the internal, that's
  // the simplest; we store propName: true. Then for properties which have a different target, we store the string
  // "target". When this gets more complex I'll restructure this code

  const setters = {}
  const getters = {}

  for (const [ propName, description ] of Object.entries(interfaceDescription)) {
    if (reservedPropNames.includes(propName)) continue

    if (typeof description === "string") {
      // Simply map propName to the given targetName
      setters[propName] = getters[propName] = description
    } else if (typeof description === "object") {
      let { aliases, conversion, target, as, setAs, getAs, equalityCheck, destructuring, readOnly, writeOnly, typecheck, set, get, onSet, onGet, setMerge } = description

      if (readOnly && writeOnly) continue // lol
      let needsSetter = !readOnly
      let needsGetter = !writeOnly

      if (aliases) {
        for (const alias of Array.from(aliases)) {
          needsSetter ? setters[alias] = propName : 0
          needsGetter ? getters[alias] = propName : 0
        }
      }

      // First typecheck, then convert, then destructure, then target, then onSet
      if (needsSetter) {
        if (set) {
          // Specific instructions for setting
          setters[propName] = set
        } else {
          const steps = []

          if (typecheck) {
            let typecheckFunction = createTypecheck(typecheck)
            if (typecheckFunction)
              steps.push({type: "typecheck", typecheck: typecheckFunction})
          }
          if (conversion) steps.push({ type: "conversion", conversion: createConversion(conversion) })
          if (destructuring) steps.push({type: "destructuring", destructuring})

          steps.push({ type: "target", target: target ?? propName, as: setAs ?? as ?? "real", equalityCheck: equalityCheck ?? 0, merge: !!setMerge })

          if (onSet) steps.push({ type: "onSet", onSet })

          if (steps.length === 0) setters[propName] = true
          else if (steps.length === 1) setters[propName] = steps[0]
          else setters[propName] = steps
        }
      }

      // First target, then destructure
      if (needsGetter) {
        if (get) {
          // Specific instructions for getting
          getters[propName] = get
        } else {
          const steps = []

          if (onGet) steps.push({ type: "onGet", onGet })

          if (destructuring) steps.push({type: "restructuring", restructuring: invertDestructure(destructuring)})
          else steps.push({ type: "target", target: target ?? propName, as: getAs ?? as ?? "real" })

          if (steps.length === 0) getters[propName] = true
          else if (steps.length === 1) getters[propName] = steps[0]
          else getters[propName] = steps
        }
      }
    } else {
      // Map directly to the same property name
      setters[propName] = getters[propName] = true
    }
  }

  function set (element, name, value) {
    if (typeof name === "object") {
      // Passed a dictionary of values to set
      for (const [ propName, propValue ] of Object.entries(name)) {
        set(element, propName, propValue)
      }

      return
    }

    let steps = setters[name]
    if (typeof steps === "undefined") {
      // Silently fail
    } else if (typeof steps === "boolean") element.props.set(name, value)
    else if (typeof steps === "string") element.props.set(steps, value)
    else if (typeof steps === "function") steps.bind(element)(value)
    else {
      steps = Array.isArray(steps) ? steps : [steps]

      for (const step of steps) {
          if (step.type === "destructuring") {
            let destructuring = step.destructuring

            for (const [propName, propValue] of Object.entries(value)) {
              let renamed = destructuring[propName]

              if (renamed === undefined) continue
              else if (typeof renamed !== "string") renamed = propName

              set(element, renamed, propValue)
            }

            return
          } else if (step.type === "target") {
            let { target, as, equalityCheck, merge } = step

            if (merge) {
              value = { ...element.props.get(target, as), ...value }
            }

            element.props.set(target, value, equalityCheck, as)
          } else if (step.type === "conversion") {
            value = step.conversion(value)
          } else if (step.type === "typecheck") {
            let typecheck = step.typecheck(value)
            if (typecheck !== true) {
              throw new TypeError(`Failed typecheck on parameter '${name}' on element #${element.id}. Error message: ${typecheck}`)
            }
          } else if (step.type === "onSet") {
            step.onSet.bind(element)(value)
          }
      }
    }
  }

  function get (element, name) {
    let steps = getters[name]

    if (typeof steps === "undefined"){
      // Silently fail
    } else if (typeof steps === "boolean") return element.props.get(name)
    else if (typeof steps === "string") return element.props.get(steps)
    else if (typeof steps === "function") return steps.bind(element)()
    else {
      let value
      steps = Array.isArray(steps) ? steps : [steps]

      for (const step of steps) {
        if (step.type === "target") {
          value = element.props.get(step.target, step.as)
        } else if (step.type === "restructuring") {
          let restructuring = step.restructuring
          let ret = {}

          for (let [internalName, propName] of Object.entries(restructuring)) {
            if (typeof internalName !== "string") internalName = propName

            ret[propName] = get(element, internalName)
          }

          return ret
        } else if (step.type === "onGet") {
          step.onGet.bind(element)(value)
        }
      }

      return value
    }
  }

  return {
    set,
    get,
    setters,
    getters,
    description: interfaceDescription
  }
}

/**
 * Attach getters and setters for ease of use. Probably will only have setters/getters for the more commonly used
 * properties, to avoid clutter. Thinking about memory footprint, these functions are on a per-element-class basis, so
 * it isn't too worrying in my opinion.
 * @param prototype
 * @param constructedInterface
 */
export function attachGettersAndSetters (prototype, constructedInterface) {
  const {setters, getters} = constructedInterface

  const properties = {}

  function createPropertyDeclaration(name) {
    return properties[name] ?? (properties[name] = {})
  }

  for (let setterName of Object.keys(setters)) {
    createPropertyDeclaration(setterName).set = function (value) {
      constructedInterface.set(this, setterName, value)
    }
  }

  // Define only getters
  for (let getterName of Object.keys(getters)) {
    createPropertyDeclaration(getterName).get = function () {
      return constructedInterface.get(this, getterName)
    }
  }

  Object.defineProperties(prototype, properties)
}

export const NullInterface = constructInterface({})
