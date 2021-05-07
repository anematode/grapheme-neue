
// TODO An experimental way for type-checking and validation in element properties. These are enforced on the element props,
// not the computedProps.

export function _attachConvenienceGettersToElement (elementPrototype, elementParameters) {
  for (const [paramName, paramDetails] of Object.entries(elementParameters)) {
    Object.defineProperty(elementPrototype, paramName, {
      get () {
        return this.get(paramName)
      },
      set (value) {
        this.set(paramName, value)
      }
    })
  }
}


// Easy way of defining interacting with props TODO
