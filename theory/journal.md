# November 20

Feeling excited about Grapheme again. I wonder how many hours it will last....

Here is the overall concept. Things are similar to three.js, but with a bit more nuances. Let's take an example scene and see how it plays out in this system.

We have a scene of width 1920 and height 1080. Within the scene, there are two plots. On the left (size 960 by 1080) is a nice log-log plot (id COW) containing a set of gridlines and two functions, one of e^x (id ex) and one of x^2 (id x2). The functions are interactive, so that if you click on it anywhere, a point appears and can be dragged around. Clicking on anywhere else—including on another graph—causes the point to disappear. The points themselves are crosses and labeled with text containing the coordinates of the point. The top of the plot is labeled "Two Handsome Plots" and there are some margins on the sides; the x-axis is labeled "cows (millions)" and the y-axis is labeled "chickens (m)". On the right (size 960 by 1080) is a normal plot of the Mandelbrot set (id mandel), zoomed in rather far. On top are arrows and labels indicating various interesting parts of the set.

The code for this might look something like...

const scene = new Grapheme.InteractiveScene()

const logLog = new Grapheme.Plot2D({ id: "COW", transformation: "log-log" })
const mandel = new Grapheme.Plot2D({ id: "mandel" })

scene.add(logLog, mandel)

// Attach scene's DOM element
document.body.appendChild(scene.domElement)


There's obviously a lot going on here, but it shows a lot of the desired features. First, we have ELEMENTS, which are the various components of a scene, including plots, text boxes, the Mandelbrot set, the gridlines, the lines within the gridlines, 

# March 20

Hm... what about SVG rendering and stuff. There must be other ways for this.

In what cases does the calculation for rendering for WebGL, versus for SVG, matter? It's a relatively small set. I think the render() function should return some special thing. What should the code look like for attaching to a canvas and stuff.

```js
const renderer = new Grapheme.WebGLRenderer()
const svgRenderer = new Grapheme.SVGRenderer()
const scene = new Grapheme.InteractiveScene() // This by default creates a domElement, also to which the event listeners are attached. Can be turned off with { dom: false }. The DOM element cannot be added after the fact (?)

document.body.appendChild(scene.domElement)

const anotherCanvas = new OffscreenCanvas(5, 5)  // Some other canvas

renderer.render(scene) // Puts an image bitmap canvas inside the dom element and copies to it from the internal renderer
renderer.render(scene, anotherCanvas) // Renders the scene to another canvas
svgRenderer.render(scene) // Puts an SVG in the canvas, etc.
```

How will the rest of this stuff work? I don't think storing whether each prop changed is sustainable. It's just pointless. Then again, inheritance and all that is pretty cool. But for a thing like polylines, it's annoying to have to propagate the whole styling information...

```js
const scene = new Grapheme.InteractiveScene()
const plot = new Grapheme.InteractivePlot()
const lineThing = new Grapheme.Polyline()

scene.add(plot)
plot.add(lineThing)

lineThing.set("vertices", [[2, 5], [3, 5]])
lineThing.markUpdate().get("vertices").push([3, 3])
```

How will properties be stored? Should there be such thing as property nesting? Perhaps adding styling information later on would work, sort of "presets". What are the benefits of property nesting? It could simplify the interface and inheritance. Let's be clear what I mean. Suppose we want to make a polyline that's orange and dashed. We could do this:

```js
// Option 1
lineThing.set("lineStyle", new LineStyle2D({ color: "orange", dashPattern: "pattern" }))

// Option 2
lineThing.set({ color: "orange", dashPattern: "pattern" })
```

In the first case, lineStyle could be directly inherited, whereas in the second, you'd have to inherit color and dashPattern, which is annoying and the first would affect things like text. But maybe this is where classes and CSS-style styling would come to the rescue. Like what if you could add ".graph { color: 'orange' }" in some way. That seems far more elegant. And the keys could be complex values, like arrays and stuff. Okay, that's cool. We should use flat properties. We'll use `elem.set(propName, value)` for setting properties. For each property we also store whether it's changed, whether it's inheritable and whether it's overrideable. Should this be stored with three booleans? Or would a little bit flag thing be nice. Hm... it depends how much metadata we're storing. We could store quite a bit with a bit flag. Haha. 31, in fact. Eh, smells like premature optimization. We could also store the previous value... I think that sounds nice too, but it's only useful in a few cases. I think that stuff can be manually stored for certain classes.

There will be several rendering stages. updateStage = 0 means that nothing is updated. In Stage 1, plots are asked where they'd like to be positioned, using the getPositioningStance() function. In Stage 2, this positioning is calculated based on various heuristics and what probably looks good. In Stage 3, all properties are computed
