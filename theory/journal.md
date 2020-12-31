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


There are D

There's obviously a lot going on here, but it shows a lot of the desired features. First, we have ELEMENTS, which are the various components of a scene, including plots, text boxes, the Mandelbrot set, the gridlines, the lines within the gridlines, 


# December 31

Turns out it lasted about seven hours. Not bad!

```js
const scene = new Grapheme.Scene()


```
