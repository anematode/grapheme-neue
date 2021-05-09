import {Vec2} from "../math/vec/vec2"
import {generateCircleTriangleStrip, generateRectangleTriangleStrip} from "../algorithm/misc_geometry"
import {BoundingBox} from "../math/bounding_box"

function getMonochromeGeometryProgram (renderer) {
  const glManager = renderer.glManager

  return glManager.getProgram("MonochromeGeometry", "grapheme") ?? glManager.createProgram("MonochromeGeometry",
    `attribute vec2 v_position;
        
        uniform vec2 xy_scale;
        vec2 displace = vec2(-1, 1);
         
        void main() {
            gl_Position = vec4(v_position * xy_scale + displace, 0, 1);
        }`, `
        precision highp float;
        uniform vec4 color;
        
        void main() {
          gl_FragColor = color;
        }`, ["v_position"], ["color", "xy_scale"], "grapheme")
}

// This file lays out some of the more common renderer calls, like geometries, polylines, and text. Highly unoptimized,
// and many of these will have special cases in which they can be combined into a single call, or even altered entirely.

// Example call: { type: "gl_tri_strip_mono", geometry: Float32Array, vertexCount: 32, color: Color, elemID: "...", xyScale: [ 0.002, -0.003] }

let cow = 0

export function glTriangleStripMonochrome (renderingParams, instruction) {
  // instruction.type = "gl_tri_strip_mono"

  const renderer = renderingParams.renderer

  const { gl, glManager } = renderer
  let { geometry, color, elemID } = instruction

  if (!geometry) return

  if (!elemID) elemID = "grapheme"
  if (!color) color = {r: 0, g: 0, b: 0, a: 255}

  const programInfo = getMonochromeGeometryProgram(renderer)
  const buf = glManager.createBuffer("__gl_tri_strip_mono", elemID)

  gl.useProgram(programInfo.glProgram)

    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.DYNAMIC_DRAW)

    const vPosition = programInfo.attribs.v_position

    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(vPosition)

    gl.uniform4f(programInfo.uniforms.color, color.r / 255, color.g / 255, color.b / 255, color.a / 255)
    gl.uniform2f(programInfo.uniforms.xy_scale, 2 / renderer.canvas.width, -2 / renderer.canvas.height)

  console.log(instruction)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, geometry.length / 2)
}

export function glDebug (renderingParams, instruction) {
  if (instruction.point) {
    const point = Vec2.fromObj(instruction.point)

    const geometry = generateCircleTriangleStrip(4, point.x, point.y)

    glTriangleStripMonochrome(renderingParams, { color: {r:255, g: 0, b: 0, a: 255}, geometry })
  } else if (instruction.rectangle || instruction.rect) {
    const rectangle = BoundingBox.fromObj(instruction.rectangle || instruction.rect)

    const geometry = generateRectangleTriangleStrip(rectangle)

    glTriangleStripMonochrome(renderingParams, { color: {r:255, g: 0, b: 0, a: 255}, geometry })
  }
}

function getTextProgram (renderer) {
  const glManager = renderer.glManager

  return glManager.getProgram("Text", "grapheme") ?? glManager.createProgram("Text",
    `attribute vec2 v_position;
    attribute vec2 texcoord_position;
        
        uniform vec2 xy_scale;
        uniform vec2 texture_size;
        
        varying vec2 texcoord;
        
        vec2 displace = vec2(-1, 1);
         
        void main() {
            gl_Position = vec4(v_position * xy_scale + displace, 0, 1);
            texcoord = texcoord_position / texture_size;
        }`, `
        precision highp float;
        
        uniform vec4 color;
        uniform sampler2D text_atlas;
        
        varying vec2 texcoord;
        
        void main() {
          gl_FragColor = texture2D(text_atlas, texcoord);
        }`, ["v_position", "texcoord_position"], ["texture_size", "xy_scale", "text_atlas"], "grapheme")
}

export function glText (renderingParams, instruction, textRenderer) {
  const { font, text, x, y } = instruction

  if (!font || !text) return
  const textLocation = textRenderer.getTextLocation(instruction)

  // The text renderer does not have the text in the atlas!
  if (!textLocation) return

  const renderer = renderingParams.renderer
  const { gl, glManager } = renderer

  const atlas = textRenderer.canvas
  const atlasTexture = glManager.createTexture("__text_atlas", "grapheme")

  // Load the atlas
  gl.bindTexture(gl.TEXTURE_2D, atlasTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, atlasTexture)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

  // The text program takes in two attributes and three uniforms. The first two attributes specify the locations in the
  // canvas and in the text atlas. One of the uniforms specifies the texture, and the other two specify a transformation
  // of coordinates for each of the first two attributes.
  const programInfo = getTextProgram(renderer)

  // Buffers for the points defining the actual triangles of the text, and for the coordinates in the text atlas. The
  // former is in canvas coordinates (pixels), and the latter is in pixels on the atlas. Both are thus normalized to
  // the clip space and the atlas sample space, respectively.
  const verticesBuffer = glManager.createBuffer("__text_vertices", "grapheme")
  const textureCoordsBuffer = glManager.createBuffer("__text_texture_coords", "grapheme")

  const textureAtlasLocation = textLocation.rect

  const textRect = { x, y, w: textureAtlasLocation.w, h: textureAtlasLocation.h}

  // Calculate a rectangle of the appropriate size: a rectangle with a corner at (x, y) and with width and height equal
  // to the dimensions of the text. While it is tempting to use actualBoundingBoxDescent + Ascent directly, note that
  // the texture coordinates are actually rounded to the next integer, so the texture atlas's information's rect should
  // be used instead.
  const canvasVertices = generateRectangleTriangleStrip(textRect)

  const textureCoords = generateRectangleTriangleStrip(textureAtlasLocation)

  gl.useProgram(programInfo.glProgram)

  // Load the text rect vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, canvasVertices, gl.DYNAMIC_DRAW)

  const vPosition = programInfo.attribs.v_position

  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(vPosition)

  // Load the texture coord vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordsBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.DYNAMIC_DRAW)

  const texcoordPosition = programInfo.attribs.texcoord_position

  gl.vertexAttribPointer(texcoordPosition, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(texcoordPosition)

  gl.uniform2f(programInfo.uniforms.xy_scale, 2 / renderer.canvas.width, -2 / renderer.canvas.height)
  gl.uniform2f(programInfo.uniforms.texture_size, atlas.width, atlas.height)
  gl.uniform1i(programInfo.uniforms.text_atlas, 0)

  console.log(canvasVertices, vPosition, texcoordPosition)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}
