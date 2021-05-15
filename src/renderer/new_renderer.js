/**
 * Grapheme's renderer is going to be pretty monolithic, with a lot of interdependent moving parts. As such, I'm going
 * to keep it mostly contained within one class, perhaps with some helper classes. Doing so will also help eliminate
 * fluff and make optimization easy and expressive.
 *
 * On the surface, Grapheme's rendering sequence is simple: the renderer traverses through the scene, calls
 * getRenderingInstructions() on every element, compiles a list of all the instructions (which look something like
 * "draw this set of triangles", "draw this text"), and runs them all, returning the final product. But if the rendering
 * pipeline were so simple, there would be little point in using WebGL at all. Why not just use Canvas2D? Why learn such
 * a ridiculous API? The name of the game is parallelism and optimization. Where WebGL excels at is low-level control
 * and rapid parallel computation. Its weaknesses are in a lack of intrinsic functions (lacking text, for example) and
 * high complexity and verbosity,
 *
 * Imagine we did indeed render a scene instruction by instruction. We come across a line, so we switch to the polyline
 * program, load in the vertices into a buffer, and drawArrays -- draw it to the canvas. We then come across a piece of
 * text. WebGL cannot render text, so we switch over to a Canvas2D context and draw a piece of text onto a blank canvas.
 * We then load the blank canvas as a texture into WebGL and switch to the text program, loading in a set of vertices
 * specifying where the text is, and calling drawArrays. We then come across a couple hundred polylines in a row. For
 * each polyline, we copy its data to the buffer and render it.
 *
 * This is madness. There are two serious problems here. One is that loading buffers and textures is slow, for various
 * reasons. Another is that parallelism is seriously lacking. We have to call drawArrays several hundred times for those
 * polylines, and each call has a large constant time overhead.
 *
 * The renderer thus has several difficult jobs: minimizing buffer and texture loading, and combining consecutive calls
 * into one large drawArrays call. Accomplishing these jobs (and a few more) requires somewhat intricate algorithms,
 * which should of course be designed to allow more esoteric draw calls -- for a Mandelbrot set, say -- to still be
 * handled with consistency. There is no perfect solution, but there are certainly gains to be made. As with the props
 * of Grapheme elements, the problem is made easier by high-level abstraction. The renderer should produce a comparable
 * result when optimized, compared to when every call is made individually. (They need not be exactly the same, for
 * reasons that will become apparent.)
 *
 * Even more annoying is that the WebGL context may suddenly crash and all its buffers and programs lost in the ether.
 * The renderer thus has to be able to handle such data loss without indefinitely screwing up the rendering process. So
 * I have my work cut out, but that's exciting.
 *
 * The current thinking is a z-index based system with heuristic reallocation of changing and unchanging buffers. Given
 * a list of elements and each element's instructions, we are allowed to rearrange the instructions under certain
 * conditions: 1. instructions are drawn in order of z-index and 2. specific instructions within a given z-index may
 * specify that they must be rendered in the order in which they appear in the instruction list. The latter condition
 * allows deterministic ordering of certain instructions on the same z-index, which is useful when that suborder does
 * matter (like when two instructions for a given element are intended to be one on top of the other). Otherwise, the
 * instructions may be freely rearranged and (importantly) combined into larger operations that look the same.
 *
 * Already, such a sorting system is very helpful. Text elements generally specify a z-index of Infinity, while
 * gridlines might specify a z-index of 0 to be behind most things, and a draggable point might have an index of 20. A
 * simple algorithm to render a static image is to sort by z-index, then within each z-index group triangle draw calls
 * with the same color together, and group text draw calls together. We then proceed to render each z-index's grouped
 * calls in order.
 *
 * For a static scene, such a rendering system would work great. But in a dynamic scene, constantly reoptimizing the
 * entire scene as a result of changing some inconsequential little geometry would be stupid. Ideally, changing a little
 * geometry would merely update a single buffer or subsection of a buffer. Yet some changes do require a complete re-
 * distribution of instructions; if the scene's size doubled, for example, and all the elements changed substantially.
 * We can certainly cache information from the previous rendering process of a scene, but what do we cache? How do we
 * ensure stability and few edge cases? How do we deal with context loss?
 *
 * The first step is to understand exactly what instructions are. *Anonymous* instructions have a type, some data, and
 * an element id (which element it originated from). *Normal* instructions have a type, some data, an element id, an
 * instruction id, and a version. The point of normal instructions is to represent a sort of "draw concept", where after
 * an update, that instruction may have changed slightly, but will still have the same id. The instruction associated
 * with a function plot, for example, will have some numerical ID, and when the plot changes somehow, the version will
 * increase, but the numerical ID will remain the same. Conceptually, this means that the instruction to draw the
 * function plot has been rewritten, and the old data is basically irrelevant -- and buffers associated with that
 * data can and should be reused or reallocated.
 *
 * Anonymous instructions, on the other hand, have no identical concept of "versioning". Anonymous instructions are
 * entirely reallocated or deleted every time their element updates. These instructions are generally used to indicate
 * instructions which are very prone to change and where its values should be tied solely to the element updating.
 */

import {getVersionID} from "../core/utils"
import {TextRenderer} from "./text_renderer"
import {generateRectangleTriangleStrip} from "../algorithm/misc_geometry"
import {BoundingBox} from "../math/bounding_box"
import {calculatePolylineVertices} from "../algorithm/polyline_triangulation"
import {Pen} from "../other/pen"

// Functions taken from Mozilla docs
function createShaderFromSource (gl, shaderType, shaderSource) {
  const shader = gl.createShader(shaderType)

  gl.shaderSource(shader, shaderSource)
  gl.compileShader(shader)

  const succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS)

  if (succeeded) return shader
  const err = new Error(gl.getShaderInfoLog(shader))

  gl.deleteShader(shader)
  throw err
}

function createGLProgram (gl, vertexShader, fragShader) {
  const program = gl.createProgram()

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragShader)

  gl.linkProgram(program)

  const succeeded = gl.getProgramParameter(program, gl.LINK_STATUS)

  if (succeeded) return program
  const err = new Error(gl.getProgramInfoLog(program))

  gl.deleteProgram(program)
  throw err
}

const MonochromaticGeometryProgram = [`
precision highp float;
attribute vec2 vertexPosition;
// Transforms a vertex from pixel coordinates to clip space
uniform vec2 xyScale;
vec2 displacement = vec2(-1, 1);
         
void main() {
   gl_Position = vec4(vertexPosition * xyScale + displacement, 0, 1);
}`, `
precision highp float;
uniform vec4 color;
        
void main() {
   gl_FragColor = color;
}`,

  ["vertexPosition"], ["color", "xyScale"]
]

const TextProgram = [`
precision highp float;
attribute vec2 vertexPosition;
attribute vec2 texCoords;
        
uniform vec2 xyScale;
uniform vec2 textureSize;
        
varying vec2 texCoord;
vec2 displace = vec2(-1, 1);
         
void main() {
  gl_Position = vec4(vertexPosition * xyScale + displace, 0, 1);
  texCoord = texCoords / textureSize;
}`, `
precision highp float;
        
uniform vec4 color;
uniform sampler2D textAtlas;
        
varying vec2 texCoord;
        
void main() {
  gl_FragColor = texture2D(textAtlas, texCoord);
}`,
  ["vertexPosition", "texCoords"], ["textureSize", "xyScale", "textAtlas", "color"]
]

/**
 * Currently accepted draw calls:
 *
 * Triangle strip: { type: "triangle_strip", vertices: Float32Array, color: { r: (int), g: (int), b: (int), a: (int) } }
 * Debug: { type: "debug" }
 * Text: { type: "text", font: (string), x: (float), y: (float), color: { r: ... } }
 */

export class GraphemeWebGLRenderer {
  constructor () {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl2")

    /**
     * The main rendering buffer
     * @type {HTMLCanvasElement}
     */
    this.canvas = canvas

    /**
     * The renderer's WebGL context. Assuming WebGL2 for now
     * @type {WebGLRenderingContext}
     */
    this.gl = gl

    /**
     * Map between scene ids and known information about them
     * @type {Map<string, {}>}
     */
    this.sceneCaches = new Map()

    /**
     * A mapping between program names and valid programs. When the context is lost, this map is reset
     * @type {Map<string, { glProgram: WebGLProgram, attribs: {}, uniforms: {} }>}
     */
    this.programs = new Map()

    this.buffers = new Map()

    this.textures = new Map()

    this.textRenderer = new TextRenderer()
  }

  /**
   * Create and link a program and store it in the form { glProgram, attribs, uniforms }, where glProgram is the
   * underlying program and attribs and uniforms are a dictionary of attributes and uniforms from the program.
   * @param programName {string}
   * @param vertexShaderSource {string}
   * @param fragShaderSource {string}
   * @param attributeNames {string[]}
   * @param uniformNames {string[]}
   * @return  {{glProgram: WebGLProgram, attribs: {}, uniforms: {}}} The program
   */
  createProgram (programName, vertexShaderSource, fragShaderSource, attributeNames=[], uniformNames=[]) {
    this.deleteProgram(programName)

    const { gl } = this

    const glProgram = createGLProgram(gl,
      createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource),
      createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragShaderSource))

    const attribs = {}
    for (const name of attributeNames) {
      attribs[name] = gl.getAttribLocation(glProgram, name)
    }

    const uniforms = {}
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(glProgram, name)
    }

    const program = { glProgram, attribs, uniforms }
    this.programs.set(programName, program)

    return program
  }

  /**
   * Get the program of a given name, returning undefined if it does not exist
   * @param programName {string}
   * @returns {{glProgram: WebGLProgram, attribs: {}, uniforms: {}}}
   */
  getProgram (programName) {
    return this.programs.get(programName)
  }

  /**
   * Delete a program, including the underlying GL program
   * @param programName {string}
   */
  deleteProgram (programName) {
    const program = this.getProgram(programName)

    if (program) {
      this.gl.deleteProgram(program.glProgram)
      this.programs.delete(programName)
    }
  }

  getMonochromaticGeometryProgram () {
    return this.getProgram("MonochromaticGeometry") ??
      this.createProgram("MonochromaticGeometry", ... MonochromaticGeometryProgram)
  }

  getTextProgram () {
    return this.getProgram("Text") ?? this.createProgram("Text", ... TextProgram)
  }

  getTexture (textureName) {
    return this.textures.get(textureName)
  }

  deleteTexture (textureName) {
    let texture = this.getTexture(textureName)

    if (texture !== undefined) {
      this.gl.deleteTexture(this.getTexture(textureName))
      this.textures.delete(textureName)
    }
  }

  createTexture (textureName) {
    this.deleteTexture(textureName)
    const texture = this.gl.createTexture()

    this.textures.set(textureName, texture)
    return texture
  }

  getBuffer (bufferName) {
    return this.buffers.get(bufferName)
  }

  createBuffer (bufferName) {
    let buffer = this.getBuffer(bufferName)

    if (!buffer) {
      buffer = this.gl.createBuffer()
      this.buffers.set(bufferName, buffer)
    }

    return buffer
  }

  deleteBuffer (bufferName) {
    const buffer = this.getBuffer(bufferName)

    if (buffer !== undefined) {
      this.buffers.delete(bufferName)
      this.gl.deleteBuffer(buffer)
    }
  }

  getTextAtlasTexture () {
    let texture = this.getTexture("TextAtlas")
    if (!texture) {
      texture = this.createTexture("TextAtlas")

      const { gl } = this

      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    }

    return texture
  }

  /**
   * Resize and clear the canvas, only clearing if the dimensions haven't changed, since the buffer will be erased.
   * @param width
   * @param height
   */
  clearAndResizeCanvas (width, height) {
    const { canvas } = this

    if (canvas.width === width && canvas.height === height) {
      this.clearCanvas()
    } else {
      canvas.width = width
      canvas.height = height

      this.gl.viewport(0, 0, width, height)
    }
  }

  clearCanvas () {
    const { gl } = this

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  createSceneCache (sceneID) {
    let cache = this.sceneCaches.get(sceneID)

    if (!cache) {
      cache = {}

      this.sceneCaches.set(sceneID, cache)
    }

    return cache
  }

  /**
   *
   * @param drawingUnits
   * @returns {boolean}
   */
  generateTextAtlas (drawingUnits) {
    const { textRenderer } = this
    let hasText = false

    textRenderer.clearText()

    for (const drawingUnit of drawingUnits) {
      let { instructions } = drawingUnit

      for (const instruction of instructions) {
        if (instruction.type === "text") {
          textRenderer.draw(instruction)
          hasText = true
        }
      }
    }

    if (hasText) textRenderer.runQueue()

    return hasText
  }

  renderText (canvasVerticesBuffer, textureCoordsBuffer, textRenderCount) {
    const { gl, canvas } = this
    const atlasTexture = this.getTextAtlasTexture()

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // Bind atlas texture to texture 0
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture)

    const programInfo = this.getTextProgram()

    const { vertexPosition, texCoords } = programInfo.attribs
    const atlas = this.textRenderer.canvas

    // Load the text rect vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, canvasVerticesBuffer)

    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(vertexPosition)

    // Load the texture coord vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordsBuffer)

    gl.vertexAttribPointer(texCoords, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(texCoords)

    gl.useProgram(programInfo.glProgram)

    const { xyScale, textureSize, textAtlas } = programInfo.uniforms

    gl.uniform2fv(xyScale, this.getXYScale())
    gl.uniform2f(textureSize, atlas.width, atlas.height)
    gl.uniform1i(textAtlas, 0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, textRenderCount * 4)
  }

  getXYScale () {
    return [ 2 / this.canvas.width, -2 / this.canvas.height ]
  }

  renderMonochromaticGeometry (canvasVerticesBuffer, vertexCount, color={r: 0, g: 0, b: 0, a: 255}, drawMode=this.gl.TRIANGLE_STRIP) {
    const programInfo = this.getMonochromaticGeometryProgram()

    const { vertexPosition } = programInfo.attribs
    const { xyScale, color: colorUniform } = programInfo.uniforms

    const { gl } = this

    gl.bindBuffer(gl.ARRAY_BUFFER, canvasVerticesBuffer)

    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(vertexPosition)

    gl.useProgram(programInfo.glProgram)

    gl.uniform2fv(xyScale, this.getXYScale())
    gl.uniform4f(colorUniform, color.r / 255, color.g / 255, color.b / 255, color.a / 255)

    gl.drawArrays(drawMode, 0, vertexCount)
  }

  // Hopefully will help us understand weird problems by drawing things on the screen
  debug (instruction) {
    let debugBuffer = this.createBuffer("debug")
    let rectangle = instruction.rectangle || instruction.rect

    const { gl } = this

    gl.bindBuffer(gl.ARRAY_BUFFER, debugBuffer)

    let arr, mode

    if (rectangle) {
      rectangle = BoundingBox.fromObj(rectangle)

      arr = generateRectangleTriangleStrip(rectangle)
      mode = gl.LINE_STRIP
    }

    if (arr) {
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.DYNAMIC_DRAW)

      this.renderMonochromaticGeometry(debugBuffer, arr.length / 2, { r: 255, g: 0, b: 0, a: 255 }, mode)
    }
  }

  /**
   * Somewhat tentative method to render a scene. Obviously skips a lotttt of steps.
   * @param scene
   */
  renderScene (scene) {
    // The scene should be fully updated
    scene.updateAll()

    this.clearAndResizeCanvas(scene.width, scene.height)

    const sceneCache = this.createSceneCache(scene.id)
    const lastVersion = +sceneCache.version

    // Last instructions stores a
    let lastInstructions = sceneCache.lastInstructions
    if (!lastInstructions)
      lastInstructions = sceneCache.lastInstructions = new Map()

    const instructions = []

    scene.apply(element => {
      const elemInstructions = element.getRenderingInstructions()

      if (elemInstructions) {
        if (Array.isArray(elemInstructions))
          instructions.push(...elemInstructions)
        else
          instructions.push(elemInstructions)
      }
    })

    if (instructions.length === 0) return

    // The first step is to sort the instructions by their z-index, at which point we create a list of drawing units
    // for each z-index value.
    instructions.sort((a, b) => a.zIndex - b.zIndex)

    // The next step is to then group each set of consecutive equal zIndex values into their own drawing unit.
    const drawingUnits = []
    let drawingUnitZIndex = -1
    let drawingUnit

    for (let i = 0; i < instructions.length; ++i) {
      let instruction = instructions[i]
      let instructionZIndex = instruction.zIndex ?? 0

      if (instructionZIndex === drawingUnitZIndex) {
        drawingUnit.instructions.push(instruction)
      } else {
        drawingUnitZIndex = instructionZIndex
        drawingUnit = {
          zIndex: drawingUnitZIndex,
          instructions: [ instruction ]
        }

        drawingUnits.push(drawingUnit)
      }
    }

    const hasText = this.generateTextAtlas(drawingUnits)

    const { gl, textRenderer } = this

    // Load the text atlas into a texture
    if (hasText) {
      gl.bindTexture(gl.TEXTURE_2D, this.getTextAtlasTexture())
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textRenderer.canvas)

    }

    const textCanvasVerticesBuffer = this.createBuffer("TextBuffer")
    const textTextureCoordsBuffer = this.createBuffer("TextTextureCoordsBuffer")
    const monochromaticGeometryCoordsBuffer = this.createBuffer("MonochromaticGeometryCoordsBuffer")

    // Having constructed a list of drawing units in order of zIndex, we now render each instruction. Soon we will
    // optimize this, but for now we just use three buffers.
    for (const drawingUnit of drawingUnits) {
      const { instructions } = drawingUnit

      for (const instruction of instructions) {
        switch (instruction.type) {
          case "text":
            const textLocation = textRenderer.getTextLocation(instruction)
            const textureAtlasLocation = textLocation.rect
            const textRect = { x: instruction.x, y: instruction.y, w: textureAtlasLocation.w, h: textureAtlasLocation.h}

            let { align, baseline } = instruction

            textRect.x -= textRect.w * (align === "center" ? 0.5 : (align === "right" ? 1 : 0))
            textRect.y -= textRect.h * (baseline === "center" ? 0.5 : (baseline === "bottom" ? 1 : 0))

            // Text should always be snapped to integer pixels
            textRect.x = Math.round(textRect.x)
            textRect.y = Math.round(textRect.y)

            const canvasVertices = generateRectangleTriangleStrip(textRect)
            const textureCoords = generateRectangleTriangleStrip(textureAtlasLocation)

            gl.bindBuffer(gl.ARRAY_BUFFER, textCanvasVerticesBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, canvasVertices, gl.DYNAMIC_DRAW)

            gl.bindBuffer(gl.ARRAY_BUFFER, textTextureCoordsBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.DYNAMIC_DRAW)

            this.renderText(textCanvasVerticesBuffer, textTextureCoordsBuffer, 1)
            break
          case "triangle_strip":
            gl.bindBuffer(gl.ARRAY_BUFFER, monochromaticGeometryCoordsBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, instruction.vertices, gl.DYNAMIC_DRAW)

            this.renderMonochromaticGeometry(monochromaticGeometryCoordsBuffer, instruction.vertices.length / 2, instruction.color)
            break
          case "debug":
            this.debug(instruction)
            break
          case "polyline":
            const pen = instruction.pen ?? new Pen()

            const polylineVertices = calculatePolylineVertices(instruction.vertices, Pen.fromObj(pen), null)

            gl.bindBuffer(gl.ARRAY_BUFFER, monochromaticGeometryCoordsBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, polylineVertices.glVertices, gl.DYNAMIC_DRAW)

            this.renderMonochromaticGeometry(monochromaticGeometryCoordsBuffer, polylineVertices.vertexCount, pen.color)

            break
          case "default":
            break
        }
      }
    }

    sceneCache.version = getVersionID()
  }

  renderDOMScene (scene) {
    this.renderScene(scene)

    createImageBitmap(this.canvas).then(bitmap => {
      scene.bitmapRenderer.transferFromImageBitmap(bitmap)
    })
  }
}
