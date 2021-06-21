import {castableIntoMultiple, Operators} from "./operators.js"

class EvaluationError extends Error {
  constructor(message) {
    super(message)

    this.name = "EvaluationError"
  }
}

/**
 * Base class for a node in a Grapheme expression. Has children and a string type (returnType).
 *
 * A node can be one of a variety of types. A plain ASTNode signifies grouping, i.e. parentheses. Extended ASTNodes,
 * like constant nodes and operator nodes have more complexity.
 */
export class ASTNode {
  /**
   * A relatively simple base constructor, taking in only the children and the return type, which is "any" by default.
   * @param children {Array}
   * @param type {string}
   */
  constructor (children=[], type=null) {
    /**
     * Children of this node, which should also be ASTNodes
     * @type {Array}
     */
    this.children = children

    /**
     * Type of this ASTNode (real, complex, etc.)
     * @type {string}
     */
    this.type = type
  }

  /**
   * Apply a function to this node and all of its children, recursively.
   * @param func {Function} The callback function. We call it each time with (node, depth) as arguments
   * @param childrenFirst {boolean} Whether to call the callback function for each child first, or for the parent first.
   * @param depth {number}
   * @returns {ASTNode}
   */
  applyAll (func, childrenFirst=false, depth=0) {
    if (!childrenFirst)
      func(this, depth)

    let children = this.children
    for (let i = 0; i < children.length; ++i) {
      let child = children[i]
      if (child instanceof ASTNode)
        child.applyAll(func, childrenFirst, depth+1)
    }

    if (childrenFirst)
      func(this, depth)

    return this
  }

  /**
   * Evaluate the value of this node using a given scope, which gives the evaluation parameters (values of the
   * variables) among other things
   * @param scope {{}}
   * @returns {*}
   */
  evaluate (scope) {
    return this.children[0].evaluate(scope)
  }

  /**
   * Given the types of variables, construct function definitions, et cetera
   * @param typeInfo
   */
  resolveTypes (typeInfo) {
    this.children.forEach(child => child.resolveTypes(typeInfo))

    this.type = this.children[0].type
  }
}

export class VariableNode {
  constructor (name, type=null) {
    this.name = name
    this.type = type
  }

  evaluate (scope) {
    let val = scope.variables[this.name]
    if (!val)
      throw new EvaluationError(`Variable ${this.name} was not found in the scope`)

    return val
  }

  resolveTypes (typeInfo) {
    let type = typeInfo[this.name]

    this.type = type ?? "real"
  }
}

export class OperatorNode extends ASTNode {
  constructor (operator) {
    super()

    this.op = operator
    this.definition = null // One of the definitions in operators.js is actually going to be used to evaluate the node
  }

  getChildrenSignature() {
    return this.children.map(child => child.type)
  }

  evaluate (scope) {
    if (!this.definition)
      throw new EvaluationError(`Evaluation definition not generated for operator node`)

    let children = this.children.map(c => c.evaluate(scope))
    return this.definition.evaluateFunc.apply(null, children)
  }

  resolveTypes (typeInfo) {
    // We need to find the function definition that matches
    this.children.forEach(child => child.resolveTypes(typeInfo))

    let signature = this.getChildrenSignature()
    let potentialDefinitions = Operators[this.op]

    if (!potentialDefinitions) {
      throw new Error("Unknown operation " + this.op + ".")
    }

    for (let definition of potentialDefinitions) {
      if (definition.signatureWorks(signature)) {
        this.definition = definition.getDefinition(signature)
        this.type = definition.signature

        return
      }
    }

    throw new Error("Could not find a suitable definition for operator " + this.op + "(" + signature.join(', ') + ').')
  }
}

export class ConstantNode {
  constructor (value, text) {
    this.value = value
    this.text = text

    this.returnType = "real"
  }

  evaluate (scope) {
    return this.value
  }

  resolveTypes (typeInfo) {

  }
}
