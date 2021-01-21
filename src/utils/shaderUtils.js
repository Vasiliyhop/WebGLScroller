import VSShader from '../shaders/vert.glsl'
import FMShader from '../shaders/frag.glsl'
function initShaders(gl) {
    const fragmentShader = getShader(gl, gl.FRAGMENT_SHADER, FMShader)
    const vertexShader = getShader(gl, gl.VERTEX_SHADER, VSShader)

    const shaderProgram = gl.createProgram()

    gl.attachShader(shaderProgram, vertexShader)
    gl.attachShader(shaderProgram, fragmentShader)

    gl.linkProgram(shaderProgram)

    gl.useProgram(shaderProgram)

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition')
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute)
    return shaderProgram
}

function getShader(gl, type, source) {
    var shader = gl.createShader(type)

    gl.shaderSource(shader, source)

    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('Shader compilation error: ' + gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

function initBuffers(gl, shaderProgram) {
    let vertices = [
        -1, -1,
        -1, 1,
        1, 1,
        1, -1
    ]
    let indices = [0, 1, 2, 0, 2, 3]
    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    vertexBuffer.itemSize = 2
    vertexBuffer.numberOfItems = 4

    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
    indexBuffer.numberOfItems = indices.length

    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
        vertexBuffer.itemSize, gl.FLOAT, false, 0, 0)
    gl.drawElements(gl.TRIANGLE_STRIP, indexBuffer.numberOfItems, gl.UNSIGNED_SHORT, 0)
    return indexBuffer
}


export {
    initShaders,
    initBuffers
}