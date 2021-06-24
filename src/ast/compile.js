/**
 * Convert a node into a function, or set of functions.
 * @param root
 * @param opts
 */
export function compileNode (root, opts={}) {
  // Whether to do typechecks to passed arguments
  let doTypechecks = !!opts.typechecks

  // Whether to allow optimizations which may change the output due to rounding
  let fastMath = !!opts.fastMath

  // We construct the text of a function of the form (imports) => { let setup = ... ; return function (...) { ... }}
  // then create the function via new Function. The evaluation process basically involves generating variables $0, $1,
  // $2, ... that correspond to the nodes in the graph. For example, x^2+3 becomes

  // $0 = scope.x
  // $1 = 2
  // $2 = Math.pow($0, $1)
  // $3 = 3
  // $4 = $2 + $3
  // return $4

  // Breaking down the evaluation like this allows for much greater optimizations, including conditional eval (we'll
  // get to that later).

  let id = 0

  /**
   * Get id to be used for intermediate functions and the like
   * @returns {string}
   */
  function getVarName () {
    return "$" + (++id)
  }

  // Map between nodes and information about those nodes (corresponding var names, optimizations, etc.)
  let nodeInfo = new Map()

  // Mapping between function/constant import objects and their variable names
  let importInfo = new Map()

  // Text of the setup code preceding all the exported functions
  let globalSetup = ""

  /**
   * Import a function f and return a constant variable name corresponding to that function, to be placed in
   * globalSetup. Importing the same function twice returns the same variable
   * @param f {Function}
   * @returns {string}
   */
  function importFunction (f) {
    if (typeof f !== "function")
      throw new TypeError(`Unable to import function ${f}`)

    let stored = importInfo.get(f)
    if (stored) return stored

    let fName = getVarName() + "_f"

    if (doTypechecks) // Make sure f is actually a function
      globalSetup += `if (typeof ${fName} !== "function") throw new TypeError("Imported parameter ${fName} is not a function");\n`

    importInfo.set(f, fName)
    return fName
  }

  /**
   * Import a generic variable of any type
   * @param c {any} External constant
   * @returns {string} Variable name corresponding to the constant
   */
  function importConstant (c) {
    let stored = importInfo.get(c)
    if (stored) return stored

    let cName = getVarName() + "_c"

    importInfo.set(c, cName)
    return cName
  }

  // Dict of exported functions; mapping between names of functions and their arguments, setup and body
  let exportedFunctions = {}

  function exportFunction (name, args, body) {
    exportedFunctions[name] = { args, body }
  }

  

  // efText is of the form return { evaluate: function ($1, $2, ) { ... } }
  let efText = "return {" + Object.entries(exportedFunctions)
    .map(([name, info]) => `name: function (${info.args.join(',')}) { ${info.body} }`)
    .join(',') + '}'

  let nfText = globalSetup + efText

  let imports = Array.from(importInfo.entries())
  let importNames = Array.from(importInfo.values())

  // Last argument is the text of the function itself
  importNames.push(nfText)

  return Function.apply(null, importNames).apply(null, imports)
}
