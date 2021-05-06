
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

export function glTriangleStripMonochrome (renderingParams, instruction) {
  // instruction.type = "gl_tri_strip_mono"

  const renderer = renderingParams.renderer

  const { gl, glManager } = renderer
  let { geometry, color, elemID, xyScale } = instruction

  if (!geometry || !color) return

  if (!elemID) elemID = "grapheme"

  const programInfo = getMonochromeGeometryProgram(renderer)
  const buf = glManager.createBuffer("__gl_tri_strip_mono", elemID)

  console.log(buf)

  gl.useProgram(programInfo.glProgram)

  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, geometry.glVertices, gl.STATIC_DRAW)

  const vPosition = programInfo.attribs.v_position

  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(vPosition)

  gl.uniform4f(programInfo.uniforms.color, color.r / 255, color.g / 255, color.b / 255, color.a / 255)
  gl.uniform2fv(programInfo.uniforms.xy_scale, xyScale)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, geometry.vertexCount)
}
