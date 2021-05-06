
function getMonochromeGeometryProgram (renderer) {
  const glManager = renderer.glManager

  const program = glManager.getProgram("MonochromeGeometry") ?? glManager.createProgram("MonochromeGeometry",
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
        }`, ["v_position"], ["color", "xy_scale"])
}

// This file lays out some of the more common renderer calls, like geometries, polylines, and text.

export function glTriangleStripMonochrome (renderingParams, instruction) {
  // instruction.type = "gl_tri_strip_mono"

  const renderer = renderingParams.renderer

  const { gl, glManager } = renderer
  const { internal } = this

  if (!internal.geometry) return

  const program = getMonochromeGeometryProgram(renderer)

  const buf = glManager.getBuffer(this.id)

  const { glVertices, vertexCount } = internal.geometry

  gl.useProgram(polylineProgram.program)

  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, glVertices, gl.STATIC_DRAW)

  const vPosition = polylineProgram.attribs.v_position

  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(vPosition)

  const color = this.internal.color

  gl.uniform4f(polylineProgram.uniforms.color, color.r / 255, color.g / 255, color.b / 255, color.a / 255)
  gl.uniform2fv(polylineProgram.uniforms.xy_scale, internal.xy_scale)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount)
}
