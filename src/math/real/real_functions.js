import * as BasicArithmetic from './basic_arithmetic.js'
import { gamma, lnGamma } from './gamma.js'

const RealFunctions = {
  ...BasicArithmetic,
  gamma,
  lnGamma
}

// List of real functions that will internally use builtin functions from Math
const mathBuiltinNames = {
  abs: 'abs',
  arccos: 'acos',
  arcosh: 'acosh',
  arcsin: 'asin',
  arsinh: 'asinh',
  arctan: 'atan',
  artanh: 'atanh',
  atan2: 'atan2',
  ceil: 'ceil',
  cbrt: 'cbrt',
  expm1: 'expm1',
  cos: 'cos',
  cosh: 'cosh',
  exp: 'exp',
  floor: 'floor',
  hypot: 'hypot',
  ln: 'log',
  ln1p: 'log1p',
  log2: 'log2',
  log10: 'log10',
  max: 'max',
  min: 'min',
  pow: 'pow',
  round: 'round',
  sign: 'sign',
  sin: 'sin',
  sinh: 'sinh',
  sqrt: 'sqrt',
  tan: 'tan',
  tanh: 'tanh',
  trunc: 'trunc'
}

for (const [name, builtin] in Object.values(mathBuiltinNames)) {
  RealFunctions[name] = Math[builtin]
}

// Prevent modification of RealFunctions
Object.freeze(RealFunctions)

export { RealFunctions }
