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
 */

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
     * A mapping between program names and valid programs. When the context is lost, this map is reset
     * @type {Map<string, { glProgram: WebGLProgram, attribs: {}, uniforms: {} }>}
     */
    this.programs = new Map()

    this.buffers = new Map()

    this.textures = new Map()
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

    gl.clearColor(1, 0, 0, 0.1)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  renderInstructions (instructions) {
    
  }
}
