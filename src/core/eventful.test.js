import {Eventful} from "./eventful"

class ChildishEventful extends Eventful {
  constructor() {
    super()

    this.children = []
  }
}

describe("Eventful", () => {
  test("add, remove and trigger single listener", () => {
    const evt = new Eventful()
    const callback = jest.fn()
    const data = {name: "Quinoa"}

    expect(evt.addEventListener("huzzah", callback), "addEventListener returns self").toBe(evt)
    expect(evt.triggerEvent("huzzah", data), "triggerEvent returns false when listener doesn't return").toBe(false)
    expect(callback).toBeCalledWith(data, evt, "huzzah")

    callback.mockClear()

    expect(evt.removeEventListener("huzzah", callback), "removeEventListener returns self").toBe(evt)
    expect(callback, "callback should not be called after removal").not.toBeCalled()
  })

  test("add, remove, and trigger multiple listeners", () => {
    // callback 1, 2, 3, 4, 5 added, then callback 2, 4 removed
    const evt = new Eventful()
    const callback1 = jest.fn()
    const callback2 = jest.fn()
    const callback3 = jest.fn()
    const callback4 = jest.fn()
    const callback5 = jest.fn()
    const data = {name: "Quinoa"}

    expect(evt.addEventListener("huzzah", [
      callback1, callback2, callback3, callback4, callback5
    ]), "addEventListener accepts array").toBe(evt)
    expect(evt.removeEventListener("huzzah", [
      callback2, callback4
    ]), "addEventListener accepts array").toBe(evt)

    evt.triggerEvent("huzzah", data)

    ;[callback1, callback3, callback5].forEach(c => expect(c).toBeCalledWith(data, evt, "huzzah"))
    ;[callback2, callback4].forEach(c => expect(c).not.toBeCalled())

    ;[callback1, callback2, callback3, callback4, callback5].forEach(c => c.mockClear())

    expect(evt.removeEventListeners("huzzah"), "removeEventListeners returns self").toBe(evt)

    evt.triggerEvent("huzzah")

    ;[callback1, callback2, callback3, callback4, callback5].forEach(c => expect(c).not.toBeCalled())
  })

  test("throws on an invalid event name or callback", () => {
    // Event names may be any non-empty string
    const evt = new Eventful()
    const badEventNames = [0, -Infinity, NaN, '', [NaN], ['hello', '']]
    const badFunctions = [3, "cow"]

    for (const bad of badEventNames) {
      expect(() => evt.addEventListener(bad, () => null), "Given bad name: " + bad).toThrow()
    }

    for (const bad of badFunctions) {
      expect(() => evt.addEventListener("valid event name", bad), "Given bad callback: " + bad).toThrow()
    }
  })
})
