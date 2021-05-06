// This function takes in a GL rendering context, a type of shader (fragment/vertex),
// and the GLSL source code for that shader, then returns the compiled shader
function createShaderFromSource (gl, shaderType, shaderSourceText) {
  // create an (empty) shader of the provided type
  const shader = gl.createShader(shaderType)

  // set the source of the shader to the provided source
  gl.shaderSource(shader, shaderSourceText)

  // compile the shader!! piquant
  gl.compileShader(shader)

  // get whether the shader compiled properly
  const succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS)

  if (succeeded) {
    return shader // return it if it compiled properly
  }

  const err = new Error(gl.getShaderInfoLog(shader))

  // delete the shader to free it from memory
  gl.deleteShader(shader)

  // throw an error with the details of why the compilation failed
  throw err
}

// This function takes in a GL rendering context, the fragment shader, and the vertex shader,
// and returns a compiled program.
function createGLProgram (gl, vertShader, fragShader) {
  // create an (empty) GL program
  const program = gl.createProgram()

  // link the vertex shader
  gl.attachShader(program, vertShader)

  // link the fragment shader
  gl.attachShader(program, fragShader)

  // compile the program
  gl.linkProgram(program)

  // get whether the program compiled properly
  const succeeded = gl.getProgramParameter(program, gl.LINK_STATUS)

  if (succeeded) {
    return program
  }

  const err = new Error(gl.getProgramInfoLog(program))

  // delete the program to free it from memory
  gl.deleteProgram(program)

  // throw an error with the details of why the compilation failed
  throw err
}

/**
 @class GLResourceManager stores GL resources on a per-context basis. This allows the
 separation of elements and their drawing buffers in a relatively complete way.
 It is given a gl context to operate on, and creates programs in manager.programs
 and buffers in manager.buffers. programs and buffers are simply key-value pairs
 which objects can create (and destroy) as they please.

 Buffers have a name and are owned by some other name. This name is generally the id of
 the element which has created the buffer. For buffers which are shared or not used by
 some element, the owner may be given as "misc", which is a reserved id. Buffers used
 by the system are under the owner "grapheme". The purpose of the owner system is that
 when an element is destroyed, all of its buffers can be immediately freed by deleting
 all buffers under a given owner.

 Most buffers are created by various instructions from a given element. These buffers
 are not created directly from inside the element's code, per se, but the render call
 which generates the associated buffer will place it under the element's ownership.
 These render call generated buffers are somewhat special, in that they are dynamically
 created and destroyed by the renderer. Because buffers need to be cleaned up eventually,
 there are two optimizations to be made. The first is assigning instructions an ID.
 This ID does not mean "this exact instruction", but a more vague concept of "this
 instruction that may be used again with different parameters". Take a polyline, for
 example. It could return { instruction: "gl_tri_strip_mono", vertices ... } every time,
 in which case the renderer would use a single buffer in the "grapheme" ownership which
 is used for generic gl_tri_strip_mono calls, using the same buffer for each time an
 instruction without an ID is called. This is slow and annoying. An improvement is to
 give an instruction an ID, which basically means, "if I give you another instruction
 with this id that is different, you can forget about the old instruction with that id".
 In other words, the buffer allocated by the previous instruction can be destroyed or
 reused. The simplest way to do this is to assign instructions a version. Taking the
 polyline case, for example, every time it tells the renderer what to do, it gives
 the instruction id associated with drawing the polyline, which is static, and a version,
 meaning "whether the instruction has changed since last time". In this case, the
 instruction is the same but the vertices have changed, so the renderer can reuse the
 old buffer and just load in the new data. And if the instruction type has changed for
 whatever reason, the renderer can destroy the old buffers associated with that
 instruction and create new ones as necessary for the new call.

 The general structure of stored buffers (and textures, etc.) is thus:

 - owners
   - misc
     -buffers
       - all random buffers that elements may share outside of the renderer's control, etc
     -textures
     -programs
   - grapheme
     - all internal buffers
     - gl_tri_strip_mono: used for any random instructions that don't have an element owner
   - elem-1
     - all element-specific buffers and textures, including auto-generated instructions.
       Instruction buffers will always be prepended with two underscores __ to avoid name
       conflicts with user buffers.

 The actual names of the instruction buffers are stored in the *renderer*, but the buffers
 are grouped by owner in the *manager*. The reason is that it makes sense to give the
 element unfettered access to its own buffers.
 */
export class GLResourceManager {
  /**
   * Construct a GLResourceManager
   * @param gl {WebGLRenderingContext} WebGL context the manager will have dominion over
   */
  constructor (gl) {
    // WebGL rendering context
    this.gl = gl

    // Compiled programs and created buffers
    this.owners = new Map().set("grapheme", {
      programs: {},
      buffers: {},
      textures: {}
    })
  }

  createOwner (ownerName) {
    let already = this.owners.get(ownerName)

    if (!already) {
      already = {}
      this.owners.set(ownerName, already)
    }

    return already
  }

  getOwner (ownerName) {
    return this.owners.get(ownerName)
  }

  hasOwner (ownerName) {
    return !!this.getOwner(ownerName)
  }

  deleteOwner (ownerName) {
    // TODO free all owner resources

    this.owners.delete(ownerName)
  }

  /**
   * Compile a program and store it in this.programs
   * @param programName {string} Name of the program, used to identify the program
   * @param vertexShaderSource {string} Source code of the vertex shader
   * @param fragmentShaderSource {string} Source code of the fragment shader
   * @param vertexAttributeNames {Array} Array of vertex attribute names
   * @param uniformNames {Array} Array of uniform names
   * @param ownerName
   */
  createProgram (programName, vertexShaderSource, fragmentShaderSource,
                 vertexAttributeNames = [], uniformNames = [], ownerName="misc") {
    if (this.hasProgram(programName, ownerName)) {
      // if this program name is already taken, delete the old one
      // this.deleteProgram(programName, ownerName)
    }

    const owner = this.createOwner(ownerName)

    const { gl } = this

    // The actual gl program itself
    const glProgram = createGLProgram(gl,
      createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource),
      createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragmentShaderSource))

    // pairs of uniform names and their respective locations
    const uniforms = {}
    for (let i = 0; i < uniformNames.length; ++i) {
      const uniformName = uniformNames[i]

      uniforms[uniformName] = gl.getUniformLocation(glProgram, uniformName)
    }

    // pairs of vertex attribute names and their respective locations
    const vertexAttribs = {}
    for (let i = 0; i < vertexAttributeNames.length; ++i) {
      const vertexAttribName = vertexAttributeNames[i]

      vertexAttribs[vertexAttribName] = gl.getAttribLocation(glProgram, vertexAttribName)
    }

    if (!owner.programs)
      owner.programs = {}

    let programInfo = {
      glProgram,
      uniforms,
      attribs: vertexAttribs
    }

    owner[programName] = programInfo

    return programInfo
  }

  /**
   * Get a buffer with a certain name and owner, creating it if it doesn't exist
   * @param bufferName {string} Name of the buffer
   * @param ownerName {string} Buffer owner
   */
  createBuffer (bufferName, ownerName="misc") {
    // If buffer already exists, return

    const owner = this.createOwner(ownerName)
    if (!owner.buffers) owner.buffers = {}

    let buffer = owner.buffers[bufferName]
    if (!buffer) {
      buffer = owner.buffers[bufferName] = this.gl.createBuffer()
    }

    console.log(ownerName, owner, bufferName)

    return buffer
  }

  getBuffer (bufferName, ownerName="misc") {
    const owner = this.getOwner(ownerName)

    return owner?.buffers[bufferName]
  }

  /**
   * Retrieve program from storage
   * @param programName {string} Name of the program
   * @param ownerName
   * @returns {Object} Object of the form {program, uniforms, vertexAttribs}
   */
  getProgram (programName, ownerName='misc') {
    const programs = this.getOwner(ownerName)?.programs

    return programs ? programs[programName] : undefined
  }

  /**
   * Whether this manager has a buffer with a given name
   * @param bufferName Name of the buffer
   * @param owner
   * @returns {boolean} Whether this manager has a buffer with that name
   */
  hasBuffer (bufferName, owner='misc') {
    return this.getBuffer(bufferName, owner) !== undefined
  }

  /**
   * Whether a program with programName exists
   * @param programName {string} Name of the program
   * @param owner
   * @returns {boolean} Whether that program exists
   */
  hasProgram (programName, owner="misc") {
    return this.getProgram(programName, owner) !== undefined
  }


  createTextureFromImage (name, image) {
    const { gl } = this

    const newTexture = this.createTexture(name)

    gl.bindTexture(gl.TEXTURE_2D, newTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

    return newTexture
  }
}
