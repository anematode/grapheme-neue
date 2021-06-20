/**
 * In this file, we convert strings representing expressions in Grapheme into their ASTNode counterparts. For example,
 * x^2 is compiled to OperatorNode{operator=^, children=[VariableNode{name="x"}, ConstantNode{value="2"}]}
 */
import { getAngryAt } from './parser_error.js'

/**
 * Base class for a node in a Grapheme expression. Has children and a string type (returnType).
 *
 * A node can be one of a variety of types. A plain ASTNode signifies grouping, i.e. parentheses. Extended ASTNodes,
 * like constant nodes and operator nodes have more complexity.
 */
class ASTNode {
  /**
   * A relatively simple base constructor, taking in only the children and the return type, which is "any" by default.
   * @param children {Array}
   * @param returnType {string}
   */
  constructor (children=[], returnType="any") {
    /**
     * Children of this node, which should also be ASTNodes
     * @type {Array}
     */
    this.children = children

    /**
     * Type of this ASTNode (real, etc.)
     * @type {string}
     */
    this.returnType = returnType
  }

  /**
   * Apply a function to this node and all of its children, recursively.
   * @param func {Function} The callback function. We call it each time with (node, depth) as arguments
   * @param childrenFirst {boolean} Whether to call the callback function for each child first, or for the parent first.
   * @param depth {number}
   * @returns {ASTNode}
   */
  applyAll (func, childrenFirst=false, depth = 0) {
    if (!childrenFirst)
      func(this, depth)

    let children = this.children
    for (let i = 0; i < children.length; ++i) {
      let child = children[i]
      if (child.applyAll) // Check needed because children may be tokens, not ASTNodes
        child.applyAll(func, childrenFirst, depth+1)
    }

    if (childrenFirst)
      func(this, depth)

    return this
  }
}

class VariableNode extends ASTNode {
  constructor (name) {
    super()

    this.name = name
  }
}

class OperatorNode extends ASTNode {
  constructor (operator) {
    super()

    this.op = operator
  }
}

class ConstantNode extends ASTNode {
  constructor (value, text, invisible) {
    super([], "real")

    this.value = value
    this.text = text
    this.invisible = !!invisible
  }

}

const OperatorSynonyms = {
  'arcsinh': 'asinh',
  'arsinh': 'asinh',
  'arccosh': 'acosh',
  'arcosh': 'acosh',
  'arctanh': 'atanh',
  'artanh': 'atanh',
  'arcsech': 'asech',
  'arccsch': 'acsch',
  'arccoth': 'acoth',
  'arsech': 'asech',
  'arcsch': 'acsch',
  'arcoth': 'acoth',
  'arcsin': 'asin',
  'arsin': 'asin',
  'arccos': 'acos',
  'arcos': 'acos',
  'arctan': 'atan',
  'artan': 'atan',
  'arcsec': 'asec',
  'arccsc': 'acsc',
  'arccot': 'acot',
  'arsec': 'asec',
  'arcsc': 'acsc',
  'arcot': 'acot',
  'log': 'ln'
}

const operator_regex = /^[*\-\/+^]|^[<>]=?|^[=!]=|^and\s+|^or\s+/
const function_regex = /^([a-zA-Z_][a-zA-Z0-9_]*)\(/
const constant_regex = /^[0-9]*\.?[0-9]*e?[0-9]+/
const variable_regex = /^[a-zA-Z_][a-zA-Z0-9_]*/
const paren_regex = /^[()\[\]]/
const comma_regex = /^,/
const string_regex = /^"(?:[^"\\]|\\.)*"/

/**
 * Take a string and check whether its parentheses are balanced, throwing a ParserError if not.
 * @param string
 */
function checkParensBalanced(string) {
  // Stack of parentheses
  const stack = []

  let i = 0
  let err = false

  outer:
  for (; i < string.length; ++i) {
    const chr = string[i]

    switch (chr) {
      case '(': case '[':
        stack.push(chr)
        break
      case ')': case ']':
        if (stack.length === 0) {
          err = true
          break outer
        }

        if (chr === ')') {
          let pop = stack.pop()

          if (pop !== '(') {
            err = true
            break outer
          }
        } else {
          let pop = stack.pop()

          if (pop !== '[') {
            err = true
            break outer
          }
        }
    }
  }

  if (stack.length !== 0)
    err = true

  if (err)
    getAngryAt(string, i, "Unbalanced parentheses/brackets")
}

function unescapeBackslashedEscapes(string) {
  return string.replace(/\\n/g, "\n")
    .replace(/\\'/g, "\'")
    .replace(/\\n/g, "\n")
}

function* tokenizer(string) {
  // what constitutes a token? a sequence of n letters, one of the operators *-/+^, parentheses or brackets

  string = string.trimEnd()

  let i = 0
  let prev_len = string.length

  let original_string = string

  while (string) {
    string = string.trim()

    i += prev_len - string.length
    prev_len = string.length

    let match

    do {
      match = string.match(paren_regex)

      if (match) {
        yield {
          type: "paren",
          paren: match[0],
          index: i
        }
        break
      }

      match = string.match(constant_regex)

      if (match) {
        yield {
          type: "constant",
          value: match[0],
          index: i
        }
        break
      }

      match = string.match(operator_regex)

      if (match) {
        yield {
          type: "operator",
          op: match[0].replace(/\s+/g, ""),
          index: i
        }
        break
      }

      match = string.match(comma_regex)

      if (match) {
        yield {
          type: "comma",
          index: i
        }
        break
      }

      match = string.match(function_regex)

      if (match) {
        yield {
          type: "function",
          name: match[1],
          index: i
        }

        yield {
          type: "paren",
          paren: '(',
          index: i + match[1].length
        }

        break
      }

      match = string.match(variable_regex)

      if (match) {
        yield {
          type: "variable",
          name: match[0],
          index: i
        }

        break
      }

      match = string.match(string_regex)

      if (match) {
        yield {
          type: "string",
          contents: match[0].slice(1, -1),
          index: i
        }
      }

      getAngryAt(original_string, i, "Unrecognized token")
    } while (false)

    let len = match[0].length

    string = string.slice(len)
  }
}

function checkValid(string, tokens) {
  for (let i = 0; i < tokens.length - 1; ++i) {
    let token1 = tokens[i]
    let token2 = tokens[i+1]

    let token2IsUnary = (token2.op === '-' || token2.op === '+')

    if ((token1.type === "operator" || token1.type === "comma") && (token2.type === "operator" || token2.type === "comma") &&
      (!token2IsUnary || i === tokens.length - 2)) {
      getAngryAt(string, token2.index, "No consecutive operators/commas")
    }
    if (token1.paren === "(" && token2.paren === ")")
      getAngryAt(string, token2.index, "No empty parentheses")
    if (token1.paren === "[" && token2.paren === "]")
      getAngryAt(string, token2.index, "No empty brackets")
    if (token1.type === "operator" && token2.paren === ")")
      getAngryAt(string, token2.index, "No operator followed by closing parenthesis")
    if (token1.type === "operator" && token2.paren === "]")
      getAngryAt(string, token2.index, "No operator followed by closing bracket")
    if (token1.type === "comma" && token2.paren === ")")
      getAngryAt(string, token2.index, "No comma followed by closing parenthesis")
    if (token1.type === "comma" && token2.paren === "]")
      getAngryAt(string, token2.index, "No comma followed by closing bracket")
    if (token1.paren === '(' && token2.type === "comma")
      getAngryAt(string, token2.index, "No comma after starting parenthesis")
    if (token1.paren === '[' && token2.type === "comma")
      getAngryAt(string, token2.index, "No comma after starting bracket")
    if (token1.paren === '(' && token2.type === "operator" && !token2IsUnary)
      getAngryAt(string, token2.index, "No operator after starting parenthesis")
    if (token1.paren === '[' && token2.type === "operator" && !token2IsUnary)
      getAngryAt(string, token2.index, "No operator after starting bracket")
  }

  if (tokens[0].type === "comma" || (tokens[0].type === "operator" && !(tokens[0].op === '-' || tokens[0].op === '+')))
    getAngryAt(string, 0, "No starting comma/operator")

  const last_token = tokens[tokens.length - 1]
  if (last_token.type === "comma" || last_token.type === "operator")
    getAngryAt(string, tokens.length - 1, "No ending comma/operator")
}

/**
 * Find a pair of parentheses in a list of tokens, namely the first one as indexed by the closing paren/bracket. For
 * example, in (x(y(z)(w))) it will find (z).
 * @param children
 * @returns {number[]}
 */
function findParenIndices(children) {
  let startIndex = -1;

  for (let i = 0; i < children.length; ++i) {
    let child = children[i]
    if (!child.paren) continue

    if (child.paren === '(' || child.paren === '[')
      startIndex = i

    if ((child.paren === ')' || child.paren === ']') && startIndex !== -1)
      return [startIndex, i]
  }
}

/**
 * Convert constants and variables to their ASTNode counterparts
 * @param tokens {Array}
 */
function processConstantsAndVariables (tokens) {
  for (let i = 0; i < tokens.length; ++i) {
    let token = tokens[i]

    switch (token.type) {
      case "constant":
        tokens[i] = new ConstantNode(parseFloat(token.value), token.value)
        break
      case "variable":
        tokens[i] = new VariableNode(token.name)
        break
    }
  }
}

// To process parentheses, we find pairs of them and combine them into ASTNodes containing the nodes and
// tokens between them. We already know the parentheses are balanced, which is a huge help here. We basically go
// through each node recursively and convert all paren pairs to a node, then recurse into those new nodes
function processParentheses (rootNode) {
  rootNode.applyAll(node => {
    let parensRemaining = true
    while (parensRemaining) {
      parensRemaining = false
      let indices = findParenIndices(node.children)

      if (indices) {
        parensRemaining = true

        let newNode = new ASTNode()
        let expr = node.children.splice(indices[0], indices[1] - indices[0] + 1, newNode)

        newNode.children = expr.slice(1, expr.length - 1)
      }
    }
  })
}

// Turn function tokens followed by ASTNodes into OperatorNodes
function processFunctions (rootNode) {
  rootNode.applyAll(node => {
    let children = node.children

    for (let i = 0; i < children.length; ++i) {
      let token = children[i]

      if (token.type === "function") {
        let synonym = OperatorSynonyms[token.name]
        let newNode = new OperatorNode(synonym ?? token.name)

        children[i] = newNode

        // Take children from the node coming immediately after
        newNode.children = children[i + 1].children

        // Remove the node immediately after
        children.splice(i + 1, 1)
      }
    }
  })
}

// Given a node and an index i of a binary operator, combine the nodes immediately to the left and right of the node
// into a single binary operator
function combineBinaryOperator(node, i) {
  const children = node.children
  let newNode = new OperatorNode(children[i].op)

  newNode.children = [children[i - 1], children[i + 1]]

  node.children.splice(i - 1, 3, newNode)
}

// Process the highest precedence operators. Note that e^x^2 = (e^x)^2 and e^-x^2 = e^(-x^2).
function processUnaryAndExponentiation (root) {
  let operators_remaining = true

  while (operators_remaining) {
    operators_remaining = false

    root.applyAll(node => {
      let children = node.children

      // We iterate backwards
      for (let i = children.length - 1; i >= 0; --i) {
        let child = children[i]
        if (child instanceof ASTNode || !child.op) continue

        if (child.op === "-") {
          // If the preceding token is an unprocessed non-operator token, or node, then it's a binary expression
          if (i !== 0 && children[i - 1].type !== "operator")
            continue

          let newNode = new OperatorNode("-")
          newNode.children = [ children[i + 1] ]

          children.splice(i, 2, newNode)
        } else if (child.op === "+") {
          // See above
          if (i !== 0 && children[i - 1].type !== "operator")
            continue

          // Unary + is a no-op
          children.splice(i, 1)
        } else if (child.op === "^") {
          combineBinaryOperator(node, i)

          --i
        }
      }
    })
  }
}

// Combine binary operators, going from left to right, with equal precedence for all
function processOperators (root, operators) {
  root.applyAll(node => {
    let children = node.children

    for (let i = 0; i < children.length; ++i) {
      let child = children[i]
      if (child instanceof ASTNode || !child.op) continue

      if (operators.includes(child.op)) {
        combineBinaryOperator(node, i)
        --i
      }
    }
  })
}

// The index of each operator is also an enum, which is used in comparison chains to describe which operator is being used
const comparisonOperators = ['<', '<=', '==', '!=', '>=', '>']

// Process "comparison chains", which are sequences of the form 0 <= x < 2. Internally these are transformed into
// "cchain" operators, which have the form cchain(0, 1 (enum comparison), x, 0 (enum comparison), 2). Gross, but
// it's hard to cleanly represent these comparison chains otherwise. You *could* represent them using boolean operations,
// but that duplicates the internal nodes which is inefficient
function processComparisonChains (root) {
  let cchain_remaining = true
  while (cchain_remaining) {
    cchain_remaining = false

    root.applyAll(node => {
      const children = node.children

      for (let i = 0; i < children.length; ++i) {
        let child = children[i]
        if (child instanceof ASTNode || !child.op) continue

        if (comparisonOperators.includes(children[i].op)) {
          let comparisonChainFound = false

          // Found a comparison operator token; we now check for whether the tokens +2, +4, etc. ahead of it are also
          // comparison tokens. If so, we emit a comparison chain

          // Index of the last comparison token, plus 2
          let j = i + 2
          for (; j < children.length; j += 2) {
            let nextChild = children[j]
            if (nextChild instanceof ASTNode || !nextChild.op) continue

            if (comparisonOperators.includes(children[j].op)) {
              comparisonChainFound = true
            } else {
              break
            }
          }

          if (comparisonChainFound) {
            // The nodes i, i+2, i+4, ..., j-4, j-2 are all comparison nodes. Thus, all nodes in the range i-1 ... j-1
            // should be included in the comparison chain.

            

            return
          }
        }
      }
    })
  }
}


/**
 * Parse a given list of tokens, returning a single ASTNode. At this point, the tokens are a list of the form
 * { type: "function"|"variable"|"paren"|"operator"|"constant"|"comma", index: <index of the token in the original string>,
 *  op?: <operator>, name?: <name of variable>, paren?: <type of paren> }
 * @param tokens
 * @returns {ASTNode}
 */
function parseTokens(tokens) {
  processConstantsAndVariables(tokens)

  // Root node that will be returned. For now it is invalid because it contains *tokens*, but it provides the structure
  // for us to construct the full tree.
  let root = new ASTNode(tokens)

  processParentheses(root)
  processFunctions(root)
  processUnaryAndExponentiation(root)

  // PEMDAS
  processOperators(root, ['*','/'])
  processOperators(root, ['-','+'])

  processComparisonChains(root)

  console.log(root)
  return


  // Exponentiation is a right-to-left operator



  // CChain

  processOperators(comparisonOperators)
  processOperators(["and", "or"])

  root.applyAll(child => {
    if (child.children) {
      child.children = child.children.filter(child => child.type !== "comma")
    }
  })

  return root
}

function parseString(string, types={}) {
  checkParensBalanced(string)

  let tokens = []

  for (let token of tokenizer(string)) {
    tokens.push(token)
  }

  checkValid(string, tokens)

  let node = parseTokens(tokens).children[0]

  if (types)
    node.resolveTypes(types)

  return node
}

export {parseString, tokenizer}