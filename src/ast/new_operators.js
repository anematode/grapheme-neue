import {FixedOperatorDefinition} from "./new_operator.js"

export const Operators = {}

/**
 * Find the operator of a given name which matches a signature
 * @param name {string}
 * @param signature {string[]}
 */
export function resolveOperator (name, signature) {
  let candidates = Operators[name]
  if (!candidates) return

  for (let candidate of candidates) {
    if (candidate.signatureWorks(signature)) {
      return candidate
    }
  }
}

/**
 * Given the name of an operator and its definition, place it into the register of operators
 * @param name {string}
 * @param ops {OperatorDefinition[]}
 */
function registerOperator (name, ...ops) {
  if (Operators[name]) {
    Operators[name].push(...ops)
  } else {
    Operators[name] = ops
  }
}

let realAdd = new FixedOperatorDefinition({
  signature: [ "real", "real" ],
  returnType: "real",
  evaluators: {
    generic: "addition"
  }
})

let realSub = new FixedOperatorDefinition({
  signature: [ "real", "real" ],
  returnType: "real",
  evaluators: {
    generic: "subtraction"
  }
})

let realMul = new FixedOperatorDefinition({
  signature: [ "real", "real" ],
  returnType: "real",
  evaluators: {
    generic: "multiplication"
  }
})

let realDiv = new FixedOperatorDefinition({
  signature: [ "real", "real" ],
  returnType: "real",
  evaluators: {
    generic: "division"
  }
})

let realPow = new FixedOperatorDefinition({
  signature: [ "real", "real" ],
  returnType: "real",
  evaluators: {
    generic: Math.pow
  }
})

registerOperator('*', realMul)
registerOperator('+', realAdd)
registerOperator('-', realSub)
registerOperator('/', realDiv)
registerOperator('^', realPow)
