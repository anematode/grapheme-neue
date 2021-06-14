
// Given a top-level scene, construct a bunch of information about the scene, outputting a map of context ids ->
// context information and rendering instructions.

// Map: id -> { parent, elem id, info, children: [{ child: id, instructions: [] }, { , version, ... }

import {getVersionID} from "../core/utils.js"

export function buildGraph (scene) {
  const graph = new SceneGraph()
  const contextMap = graph.contextMap

  let topContext = { parent: null, id: "top", children: [], contextDepth: 0 }
  contextMap.set("top", topContext)

  let currentContext = topContext
  let contextDepth = 0

  recursivelyBuild(scene)

  // Recurse through the scene elements, not yet handling zIndex and escapeContext
  function recursivelyBuild (elem) {
    let children = elem.children
    let info = elem.getRenderingInfo()

    let instructions = info?.instructions
    let contexts = info?.contexts

    let initialContext = currentContext

    if (contexts) {
      // Time to build contexts
      contexts = Array.isArray(contexts) ? contexts : [ contexts ]

      for (const c of contexts) {
        contextDepth++

        let newContext = {
          id: c.id ?? (elem.id + '-' + getVersionID()),
          isContext: true,
          parent: currentContext,
          children: [],
          info: c,
          zIndex: c.zIndex ?? 0,
          contextDepth
        }

        contextMap.set(newContext.id, newContext)

        currentContext.children.push(newContext)
        currentContext = newContext
      }
    }

    if (instructions) {
      instructions = Array.isArray(instructions) ? instructions : [ instructions ]

      currentContext.children.push({
        id: elem.id,
        instructions
      })
    }

    if (children) {
      let childrenLen = children.length
      for (let i = 0; i < childrenLen; ++i) {
        recursivelyBuild(children[i])
      }
    }

    currentContext = initialContext
    contextDepth = currentContext.contextDepth
  }

  return graph
}

/**
 * Validate, shallow clone instructions and change their zIndex, et cetera
 * @param instruction
 */
function adjustInstruction (instruction) {
  const type = instruction.type
  if (!type) throw new Error("Instruction does not have a type. Erroneous instruction: " + JSON.stringify(instruction))

  let out = Object.assign({}, instruction)
  let zIndex = out.zIndex
  let escapeContext = out.escapeContext

  // Fill in zIndex value for sorting
  if (zIndex === undefined) {
    if (type === "text") {
      out.zIndex = Infinity
    } else {
      out.zIndex = 0
    }
  }

  if (escapeContext === undefined) {
    // Default text value
    if (type === "text") {
      out.escapeContext = "top"
    }
  } else if (escapeContext) {
    // Validate
    if (typeof escapeContext !== "string") {
      throw new Error("Instruction has an invalid escape context value. Erroneous instruction: " + JSON.stringify(instruction))
    }
  }

  return out
}

class SceneGraph {
  constructor () {
    /**
     * Mapping of <context id> -> <context info>, where contexts are specific subsets of the rendering sequence created
     * by certain groups that allow for operations to be applied to multiple elements. Example: a plot may create a
     * context to scissor element within its boundaries. The context info also contains rendering instructions
     * @type {Map<string, {}>}
     */
    this.contextMap = new Map()
  }

  computeInstructions () {
    // For each context compute a list of instructions that the renderer should run
    const { contextMap } = this

    const contexts = Array.from(contextMap.values()).sort((a, b) => b.contextDepth - a.contextDepth)

    for (const c of contexts) {
      const children = c.children

      const instructions = []
      const escapingInstructions = []

      // eventually, instructions will have the structure {child: id, instructions: [], zIndex: (number)}. zIndex of text
      // instructions is assumed to be Infinity and unspecified zIndex is 0. For now we'll just have a flat map
      for (const child of children) {
        if (child.children) {
          // Is context
          instructions.push({ id: child.id, isContext: true, zIndex: child.zIndex ?? 0 })

          // Add escaped instructions
          for (const inst of child.escapingInstructions) {
            if (inst.escapeContext === c.id)
              instructions.push(inst)
            else
              escapingInstructions.push(inst)
          }
        } else {
          for (const instruction of child.instructions) {
            let adjusted = child.instructions.map(adjustInstruction)

            for (const adj of adjusted) {
              if (adj.escapeContext) {
                adj.origContext = c

                escapingInstructions.push(adj)
              } else {
                instructions.push(adj)
              }
            }
          }
        }
      }

      c.instructions = instructions
      c.escapingInstructions = escapingInstructions
    }

    for (const c of contextMap.values()) {
      c.instructions.sort((a, b) => (a.zIndex - b.zIndex))
    }
  }

  prettyPrint () {
    let out = ""
    function log (s) {
      out += s
      out += '\n'
    }

    log(`Contexts: `)
  }
}
