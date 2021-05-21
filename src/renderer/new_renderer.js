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
import {
  combineColoredTriangleStrips,
  combineTriangleStrips,
  fillRepeating, flattenVec2Array,
  generateRectangleTriangleStrip, getActualTextLocation
} from "../algorithm/misc_geometry"
import {BoundingBox} from "../math/bounding_box"
import {calculatePolylineVertices} from "../algorithm/polyline_triangulation"
import {Pen} from "../other/pen"
import {Vec2} from "../math/vec/vec2"

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

const MulticolorGeometryProgram = [`
precision highp float;
attribute vec2 vertexPosition;
attribute vec4 vertexColor;

varying vec4 fragmentColor;

// Transforms a vertex from pixel coordinates to clip space
uniform vec2 xyScale;

vec2 displacement = vec2(-1, 1);
         
void main() {
   gl_Position = vec4(vertexPosition * xyScale + displacement, 0, 1);
   fragmentColor = vertexColor;
}`, `
precision highp float;
varying vec4 fragmentColor;
  
void main() {
   gl_FragColor = fragmentColor;
}`,

  ["vertexPosition", "vertexColor"], ["xyScale"]
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

// Given a map of zIndex -> list of instructions, generate a list of equivalent instructions
function compactInstructions (instructionMap) {

}

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

  getMulticolorGeometryProgram () {
    return this.getProgram("MulticolorGeometry") ??
      this.createProgram("MulticolorGeometry", ... MulticolorGeometryProgram)
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

  renderText (canvasVerticesBuffer, textureCoordsBuffer, vertexCount) {
    const { gl, canvas } = this
    const atlasTexture = this.getTextAtlasTexture()

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

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

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount)
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

  renderMulticolorGeometry (canvasVerticesBuffer, colorsBuffer, vertexCount, drawMode=this.gl.TRIANGLE_STRIP) {
    const programInfo = this.getMulticolorGeometryProgram()

    const { vertexPosition, vertexColor } = programInfo.attribs
    const { xyScale } = programInfo.uniforms

    const { gl } = this

    gl.bindBuffer(gl.ARRAY_BUFFER, canvasVerticesBuffer)

    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(vertexPosition)

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer)

    gl.vertexAttribPointer(vertexColor, 4, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(vertexColor)

    gl.useProgram(programInfo.glProgram)

    gl.uniform2fv(xyScale, this.getXYScale())

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
   * Statically render a scene (for now). Doesn't try to do any caching, etc., because that makes things more complicated.
   * Instead this will help us understand the underlying difficulties
   * @param scene
   */
  renderScene (scene) {
    // The scene should be fully updated
    scene.updateAll()

    this.clearAndResizeCanvas(scene.width, scene.height)

    // We first build an understanding of the scene from the renderer's point of view. The instructions should not be
    // mutated but some will have to be copied and modified; text, for example, has a default zIndex of Infinity.

    const { textRenderer } = this
    textRenderer.clearText()

    // Map between z indices and lists of instructions. A program generally won't have many z indices so this is
    // probably somewhat more efficient than sorting a list
    const instructionsMap = new Map()

    function processInstruction (instruction) {
      let zIndex = instruction.zIndex
      let isText = instruction.type === "text"

      if (zIndex === undefined) {
        zIndex = isText ? Infinity : 0
      }

      if (isText) textRenderer.draw(instruction)

      // Preprocessing, converting to triangle strip
      if (instruction.type === "polyline") {
        let pen = instruction.pen ? Pen.fromObj(instruction.pen) : Pen.DefaultPen

        const vertices = calculatePolylineVertices(flattenVec2Array(instruction.vertices), pen, new BoundingBox(0, 0, scene.width, scene.height))
        instruction = { type: "triangle_strip", vertices, color: pen.color }
      }

      if (!instructionsMap.has(zIndex)) instructionsMap.set(zIndex, [ instruction ])
      else instructionsMap.get(zIndex).push(instruction)
    }

    scene.apply(element => {
      const elemInstructions = element.getRenderingInstructions()

      if (elemInstructions) {
        if (Array.isArray(elemInstructions)) {
          elemInstructions.forEach(processInstruction)
        } else {
          processInstruction(elemInstructions)
        }
      }
    })

    textRenderer.runQueue()

    const compactedInstructions = []

    // Algorithm for combining triangle strips: <first strip> <last vertex> <first vertex of second> <second strip>
    // Length of combining n triangle strips with total length L: L + 4n - 4
    function compactSpan (instructions, spanType, spanStart, spanEnd) {
      // Try to make this fast and memory efficient
      if (spanType === "text") {
        // Gather information about the span

        let coordBufferSize = 12 * (spanEnd - spanStart) - 4
        let textureCoords = new Float32Array(coordBufferSize), canvasCoords = new Float32Array(coordBufferSize)
        let packTextureCoord = combineTriangleStrips(textureCoords)
        let packCanvasCoord = combineTriangleStrips(canvasCoords)

        for (let i = spanStart; i < spanEnd; ++i) {
          let instruction = instructions[i]
          let { anchor, position, anchorDir, spacing } = instruction

          anchor = anchor ?? position

          const textLocation = textRenderer.getTextLocation(instruction).rect

          const textRect = getActualTextLocation(textLocation, anchor, anchorDir, spacing)

          textRect.x = Math.round(textRect.x)
          textRect.y = Math.round(textRect.y)

          packTextureCoord(generateRectangleTriangleStrip(textLocation))
          packCanvasCoord(generateRectangleTriangleStrip(textRect))
        }

        return { type: "text", textureCoords, canvasCoords }
      } else if (spanType === "triangle_strip") {
        let totalLength = 0
        for (let i = spanStart; i < spanEnd; ++i) {
          let instruction = instructions[i]

          totalLength += instruction.vertices.length
        }

        let len = totalLength + 4 * (spanEnd - spanStart) - 4

        // I hate this code
        let verticesCoords = new Float32Array(len)
        let colorsCoords = new Float32Array(2 * len)
        let packVerticesCoord = combineColoredTriangleStrips(verticesCoords, colorsCoords)

        for (let i = spanStart; i < spanEnd; ++i) {
          packVerticesCoord(instructions[i].vertices, instructions[i].color)
        }

        return { type: "multicolor_triangle_strip", vertices: verticesCoords, colors: colorsCoords }
      }
    }

    for (const [ zIndex, instructions ] of instructionsMap.entries()) {
      // We wish to turn the instructions into a series of compacted instructions. For now there are two main types of
      // instructions: triangle strips and text. Thus we split the instructions into spans of triangle strips and spans
      // of text so that each can be combined.

      if (instructions.length === 0) continue

      let spanStart = 0
      let spanType = instructions[0].type

      for (let spanEnd = 1; spanEnd <= instructions.length; ++spanEnd) {
        let instruction = instructions[spanEnd]

        if (instruction?.type !== spanType) {
          // [spanStart, spanEnd) is a span of instructions of the same type
          compactedInstructions.push(compactSpan(instructions, spanType, spanStart, spanEnd))

          spanStart = spanEnd
        }
      }
    }

    const { gl } = this

    // Load the text atlas into a texture
    gl.bindTexture(gl.TEXTURE_2D, this.getTextAtlasTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textRenderer.canvas)

    const textCanvasVerticesBuffer = this.createBuffer("TextBuffer")
    const textTextureCoordsBuffer = this.createBuffer("TextTextureCoordsBuffer")
    const monochromaticGeometryCoordsBuffer = this.createBuffer("MonochromaticGeometryCoordsBuffer")
    const multicolorGeometryCoordsBuffer = this.createBuffer("MulticolorGeometryCoordsBuffer")
    const multicolorGeometryColorsBuffer = this.createBuffer("MulticolorGeometryColorsBuffer")

    // Having constructed a list of drawing units in order of zIndex, we now render each instruction. Soon we will
    // optimize this, but for now we just use three buffers.
    for (const instruction of compactedInstructions) {
      switch (instruction.type) {
        case "text":
          const { textureCoords, canvasCoords } = instruction

          gl.bindBuffer(gl.ARRAY_BUFFER, textCanvasVerticesBuffer)
          gl.bufferData(gl.ARRAY_BUFFER, canvasCoords, gl.DYNAMIC_DRAW)

          gl.bindBuffer(gl.ARRAY_BUFFER, textTextureCoordsBuffer)
          gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.DYNAMIC_DRAW)

          this.renderText(textCanvasVerticesBuffer, textTextureCoordsBuffer, textureCoords.length / 2)
          break
        case "triangle_strip":
          gl.bindBuffer(gl.ARRAY_BUFFER, monochromaticGeometryCoordsBuffer)
          gl.bufferData(gl.ARRAY_BUFFER, instruction.vertices, gl.DYNAMIC_DRAW)

          this.renderMonochromaticGeometry(monochromaticGeometryCoordsBuffer, instruction.vertices.length / 2, instruction.color)
          break
        case "multicolor_triangle_strip":
          gl.bindBuffer(gl.ARRAY_BUFFER, multicolorGeometryCoordsBuffer)
          gl.bufferData(gl.ARRAY_BUFFER, instruction.vertices, gl.DYNAMIC_DRAW)

          gl.bindBuffer(gl.ARRAY_BUFFER, multicolorGeometryColorsBuffer)
          gl.bufferData(gl.ARRAY_BUFFER, instruction.colors, gl.DYNAMIC_DRAW)

          this.renderMulticolorGeometry(multicolorGeometryCoordsBuffer, multicolorGeometryColorsBuffer,instruction.vertices.length / 2)
          break
        case "debug":
          this.debug(instruction)
          break
        case "function":
          instruction.function(this)
          break
        case "default":
          break
      }
    }
  }

  renderDOMScene (scene) {
    this.renderScene(scene)

    createImageBitmap(this.canvas).then(bitmap => {
      scene.bitmapRenderer.transferFromImageBitmap(bitmap)
    })
  }
}
