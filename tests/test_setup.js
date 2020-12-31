// An idiotic hack to allow Grapheme to load as an ES6 module while I can pretend it loaded as a bundle
const moduleLoader = document.createElement("script")

moduleLoader.innerHTML = `
import * as Grapheme from "../src/main.js"

window.Grapheme = Grapheme
window.deferLoad = () => {}

// Remove and readd the script. It won't crash now.
const script = document.getElementById("setup")
const scriptText = script.innerHTML

script.parentNode.removeChild(script)
const newScript = document.createElement("script")
newScript.setAttribute("id", "setup")
document.body.appendChild(newScript)
`

moduleLoader.setAttribute("type", "module")

document.body.appendChild(moduleLoader)

const deferLoad = () => {
  throw new Error("Normal error, loading Grapheme.")
}


