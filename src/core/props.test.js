import { ElementProps } from './props'

describe("ElementProps", () => {
  test("Adding a property", () => {
    const store = new ElementProps()

    store.set("cow", 5)
    store.set("chicken", 4)
    store.set("berry", 3)

    expect(() => store.get("cow")).toBe(5)
    expect(() => store.get("chicken")).toBe(4)

    store.delete("chicken")
    expect(() => store.get("chicken")).toBe(undefined)

    expect(() => store.set(50, NaN)).toThrow()

    store.markAllChanged(false)


  })
})
