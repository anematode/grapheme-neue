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

There will be several rendering stages, because this is complicated as hell. We want to be able to dynamically place plots in a scene. Take this code:

```js
const scene = new Grapheme.InteractiveScene()
const plot1 = new Grapheme.InteractivePlot()
const plot2 = new Grapheme.InteractivePlot()

plot1.centerOn(0, 0).requireAspectRatio(1).setWidth(5) // Changes the properties of the plot transformation. If it was previously updated, set updateStage to 0
plot2.centerOn(0, 0).requireAspectRatio(1).setWidth(0.0001)

const pointCloud = new Grapheme.PointCloud()
pointCloud.set({
  points: [4, 5, 1, 4, 8, 9],
  pointGlyph: Grapheme.Glyphs.Cross,
  color: "#005012"
})

const fplot = new Grapheme.FunctionPlot()
fplot.set({
  function: "x^3",
  thickness: 2,
  endcap: "dynamic"
})

const gridlines = new Grapheme.Gridlines()
plot2.add(gridlines)

plot1.setPadding(20)

const plotLabels = new Grapheme.PlotLabels()
plot1.add(plotLabels)

plotLabels.set({
  xaxis: "Real",
  yaxis: "Imag",
  color: "gray",
  font: "Helvetica"
})

plot1.add(pointCloud)
plot2.add(fplot)

scene.add(plot1, plot2) // Plot 1 and Plot 2 are both, say, positioned at (0,0) and have a size of 640x480 pixels, whatever the defaults are.
```

I guess computedProps is kind of the place where the ultimate props are put. But at the inheritance stage, we have to inherit from the computedProps. This is confusing as hell. How are the positions of labels going to be calculated? Ugh, this is so confusing. And how can there be continuity of labels on certain plots? Probably label objects should be kept as constant as possible.

Okay, let's figure out computedProps and inheritance first. Maybe the updating logic will include all the "special" things, like label occlusion and legends and all that.

### Properties and inheritance

See this code.
```js
const group = new Grapheme.Group()
const subgroup = new Grapheme.Group()
const elem = new Grapheme.Element()

group.set({ cow: 0, chicken: 1}, { inherit: 1 }) // 1 means inherit properties
subgroup.set({ chicken: "chicken", sheep: "sheep" })
elem.set({ goat: "goat" })

group.add(subgroup.add(elem))

elem.get("goat")  // -> "goat"
elem.get("sheep") // -> undefined
elem.get("cow") // -> undefined

elem.getComputedProp("cow") // -> 0 ?
```

What about things like auto-placing plots and legends and stuff? That stuff needs to go into computedProps, since props should be untouched. So the computed prop... isn't guaranteed to be valid until after the updating? I think that's the cleanest solution. And props/computedProps aren't marked as unchanged until updating is finished. The annoying thing is that there's no way to really encapsulate the needed data to update something from scratch, which makes consistent beasting difficult. But I think that's okay; we'll just create specialized jobs. Cool.

Okay so this is how the properties work. There is a Map with keys of the property names and values of {value, inherit: 0/1/2, changed: true/false}. The value is the current value of the property; easy enough. Inherit is the method in which that property cascades to children. The default of 0 means no inheritance. 1 means it inherits, and 2 means it inherits and cannot be overridden.

Here's how this might work in practice:

Scene: { sceneWidth: 1280, sceneHeight: 760, screenDPI: 2, canvasWidth: 2560, canvasHeight: 1520 } (all inherit 2); { boundingBox: [0, 0, 2560, 1520], interactive: true } (all inherit 0)
child of Scene, Plot: { plotTransform: PlotTransformLogLog2D( ... ), plotBoundingBox: [ 0, 0, 2560, 1520 ] } (all inherit 1), { boundingBox: [ ... same as plotBoundingBox, unless some labels escape ... ], interactive: true,  } (all inherit 0)

What are the benefits of this pure prop system, and inheritance? There is a degree of encapsulation, where the computedProps are all that's necessary to know exactly how an object is going to be rendered. It also helps us keep track of what has changed so that we can update much more quickly. If FunctionPlot2D sees that color has changed, but nothing else, it doesn't have to recompute anything. It also lends itself to a CSS-like style sheet, where you can specify the various styling of objects beforehand. It also lets us use elements out of their "natural habitat": we can freely plop a function plot in a place without a plot by giving it a suitable plotTransform, rather than "faking" a plot or something. Indeed, all the FunctionPlot2D cares about—apart from its own styling information—is the plotTransform. What are some drawbacks? It's pretty inefficient. They say no premature optimization, but I worry the complexity is just too high. Grapheme is supposed to be very fast. Plus, only a few types of properties actually NEED to be inherited. Plot transforms, canvas sizes... and what else? And only some need to be specially tracked when they change for optimization.

But why not give it a try. Let's see, step by step, how a Grapheme scene's properties will be rendered.

Stage 0: It begins. We first sort every group's children by their ordering.
Stage 1: We now arrange the things like Plot2D, PieChart, et cetera, in two stages. Their positions can be partially or completely specified, but the arranging happens at a higher level. This stage only applies to certain elements; those which take up a definite box position like a <div> or something. As an example, it's conceivable that scene.get("display") === "flex", plot1.get("minWidth") === plot2.get("minWidth") === 50, plot1.get("flex-grow") === 2, plot2.get("flex-grow") === 1. Perhaps Plot2D, PieChart etc. will have some tag on their constructors indicating they need to be arranged this way. In the first stage they'll be asked via some function getPositionStance() which will be used by the arranger. It might return something like { maxWidth: 1000, minWidth: 100, aspectRatioMin: 0.5, aspectRatioMax: 2, margins: [10, 10, 10, 10] }. I dunno. That's for future consideration.
Stage 2: We change the corresponding plotBoundingBox for these arranged things, telling each where they will continue to graph.
Stage 3: We calculate all the props according to inheritance, etc, marking what has changed in the meantime.
Stage 4: We update all the elements according to these changed props, saving appropriate data for rendering into an internal storage. Elements like FunctionPlot2D can add information about themselves to a legend registry, which can be inherited from a scene or from a plot or something.
Stage 5: We calculate the positions of all the smartly positioned things (labels, legends) using a label registry thing... oof. Complex.
Stage 6: We update all smartly positioned things.
Stage 7: We compute all bounding boxes; we are done.

Element creation is going to be annoyingly expensive, because it's going to inherit a bunch of properties it doesn't really need. That's annoying as hell. In that earlier example, adding a label and legend registry, a label would inherit eight properties, only one of which it would use. In this case I think the best option is to create a LabelSet or something like that... still annoying. But premature optimization, premature optimization... maybe it's fine. Or... an element without children can have the optimization that it only inherits/looks for properties it can actually use. I think that works.

This is still so annoying. I can't believe how complicated this problem is. Maybe I need to back up and be more restrictive, be simpler.

One of the main benefits of inheritance is that we can keep track of what has changed since the last completed update computation. Consider an EquationPlot2D for instance, that may be using a rather expensive plot. If we keep track of the change in plotTransform since the last one, we can just compute the surrounding data. If we have a simple color change, we don't have to recompute anything; if we change the dash pattern, we just have to recompute the triangulation vertices. Hm... would this be amenable to an in-progress thing? Maybe... if we throw away correctness. Even still... I fear this is too complicated. I'm having a deja vu moment here for some reason.

Maybe the answer is a combination of inheritance and explicitness? I think the question depends on what people (or me) actually WANT out of Grapheme. Velar, sure, but the primary focus is making nice graphs of functions and complex data for my projects. There is already d3.js; that's done and dusted. But d3 can't do mathematical things, and definitely can't do very complex graphs without slowing down massively due to SVG. Let me write out some recent tasks I've wanted:

* Plot a given sample on a graph which can be horizontally zoomed on, with a title "Sample" and axis labels "Time (s)" and "Amplitude"
* Plot the real and complex parts of the FFT spectrum of a given sample, using blue and orange polylines on a graph with a title "FFT of Given Signal", x-axis label "Frequency (Hz)", and a two-part legend
* Plot an FFT spectrum as a heat map, a la FL Studio (I've done that before)
* Plot a Reuleaux triangle and rotate it between two stationary lines
* Plot a general curve of constant width and rotate it in an animation, tracing its center
* Plot a point cloud and be able to drag points around
* Automatically label the two extrema of x^3-x with points, which can be clicked on for their values (Desmos does this)
* Custom label the eight extreme points on a supercircle of radius 1

This gives some motivation, and some clues. Inheritance is probably helpful... but it also causes some confusion. Perhaps the most confusing is the case of automatic labels. How should they be styled? Through inheritance? Through the class system? Or through a bunch of annoying extra props on the parent element, like "labelColor", ... ? This was already a point of confusion in the first Grapheme, so the problem has cropped up again. The class system is probably most sensible here. So I guess we'll get to that later!

# April 4

Okay, so we have coordinate spaces. We should give them names! How about graph space, clip space, pixel space, and CSS/canvas space. Graph space is, well, the points in a given plot. 

# April 16

The prop storing is starting to make sense, although inheritance seems complicated. One long-term advantage of these fancy prop stores, storing prop metadata, is that animations could be done.
