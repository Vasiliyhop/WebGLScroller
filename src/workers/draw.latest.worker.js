import { MeasureText, SetFont } from '../utils/measureUtils'
import ThreadWorker from './draw.thread.worker.js'
import { initShaders, initBuffers } from '../utils/shaderUtils'
import { hexToVec } from '../utils/textUtils'

const b = 4 //bytes per color
let props = {}
let rowCanvas
let rowCtx
let rows
// let rowsImageData = []
let rowsLength
let prepared
let s
let ca
let storedScrollTop = 0
let fullHeight
let blockHeight
let texturesNumber
let caBuff
let GL
let shaderProgram
let rafID

function drawData(data) {
    const {
        words,
        width,
        rowHeight,
        backgroundColor,
        fontStyle,
        fontWeight,
        fontSize,
        fontFamily,
        align,
        lineIndent,
        padding,
        maxBlockHeight,
        startTime,
        workerTime,
        cpuCores,
        offscreen,
    } = data

    /*
        Performance test with max texture size
        ----------------------------
        ~2%  | 352ms   - Pass data to worker
        ~4%  | 658ms   - Measure Text
        ~90% | 16439ms - Draw and get image data
        ~4%  | 713ms   - Create texture byte array
    */

    GL = offscreen.getContext('webgl')

    console.log('Worker init time: ', new Date().getTime() - startTime, ' | ', new Date().getTime() - workerTime) // <-- 738  |  352

    rowCanvas = new OffscreenCanvas(width, rowHeight)
    rowCtx = rowCanvas.getContext('2d')
    props = data

    SetFont(props, rowCtx)

    ///////////////////////
    // Measure part
    let currentStarted = new Date().getTime()

    const result = MeasureText(rowCtx, width, words, align, fontSize, lineIndent, padding)
    console.log('Worker measure time: ', new Date().getTime() - startTime, ' | ', new Date().getTime() - currentStarted)  // <-- 1396  |  658
    //////////////////////
    fullHeight = result.fullHeight
    rows = result.rows
    prepared = result.prepared
    blockHeight = fullHeight > maxBlockHeight ? maxBlockHeight : fullHeight
    texturesNumber = Math.floor(fullHeight / blockHeight) + 1

    //////////////////////
    // Slowest part V
    currentStarted = new Date().getTime()

    const [pt, pr, pb, pl] = padding
    rowsLength = rows.length
    s = width * b
    let caLength = fullHeight * s
    caBuff = new SharedArrayBuffer(caLength)
    ca = new Uint8ClampedArray(caBuff)

    //Create threads workers
    const availableThreads = cpuCores / 2
    const tenth = Math.floor(rowsLength / 90)
    let progress = 10

    let threadProps = {
        rows,
        prepared,
        backgroundColor,
        width,
        rowHeight,
        blockHeight,
        fontSize,
        fontStyle,
        fontWeight,
        fontSize,
        fontFamily,
        padding,
        s,
        caBuff,
        texturesNumber,
        availableThreads,
        tenth,
    }
    const threadWorkers = []
    let threadsDone = 0
    let texWidth = width * texturesNumber
    let setCounter = 0
    let storedProgress = progress
    for (let t = 0; t < availableThreads; t++) {
        threadProps.t = t
        threadWorkers[t] = new ThreadWorker()
        threadWorkers[t].onmessage = (event) => {
            switch (event.data.type) {
                case 'Set':
                    const {
                        draw,
                        offsetY,
                        firstLine,
                        firstInd
                    } = event.data
                    if (draw) {
                        const rowImageData = ca.subarray(offsetY * s, s * (offsetY + rowHeight))
                        if (firstLine > blockHeight - rowHeight) {
                            const firstPartLine = blockHeight - firstLine
                            const firstPart = rowImageData.subarray(0, s * firstPartLine)
                            const secondPartLine = rowHeight - firstPartLine
                            const secondPart = rowImageData.subarray(s * firstPartLine)
                            GL.texSubImage2D(GL.TEXTURE_2D, 0, firstInd * width, firstLine, width, firstPartLine, GL.RGBA, GL.UNSIGNED_BYTE, firstPart)
                            GL.texSubImage2D(GL.TEXTURE_2D, 0, (firstInd + 1) * width, 0, width, secondPartLine, GL.RGBA, GL.UNSIGNED_BYTE, secondPart)
                        } else {
                            GL.texSubImage2D(GL.TEXTURE_2D, 0, firstInd * width, firstLine, width, rowHeight, GL.RGBA, GL.UNSIGNED_BYTE, rowImageData)
                        }
                    }
                    setCounter++
                    const percent = Math.floor(progress + (setCounter * (100 - progress)) / rowsLength)
                    if (percent > storedProgress) {
                        storedProgress++
                        postMessage({ type: 'Progress', progress: storedProgress, stage: 'Prepare image data' })
                    }
                    break
                case 'Thread-Done':
                    const threadId = event.data.t
                    console.log(`<<< Thread ${threadId} is Ready`, new Date().getTime())
                    threadWorkers[threadId].terminate()
                    threadsDone++
                    if (threadsDone === availableThreads) {
                        console.log('Worker image data time: ', new Date().getTime() - startTime, ' | ', new Date().getTime() - currentStarted) // <-- 17835  |  16439
                        postMessage({ type: 'Drawn', fullHeight, blockHeight, texturesNumber })
                    }
                    break
            }
        }
        console.log(`<<< Thread ${t} ping ...`, new Date().getTime())
        threadWorkers[t].postMessage(threadProps)
    }
    drawCycle()

    console.log('====================== ')
    console.log('!!!Worker Log:')
    console.log('Words length ', words.length)
    console.log('Rows number ', rows.length)
    console.log('Full height ', fullHeight)
    console.log('Textures number ', texturesNumber)
    console.log('CA length ', caLength)
    console.log('====================== ')
}
function updateData(data) {
    const {
        wordIndex,
        selected,
        trackSelected,
    } = data

    const {
        width,
        height,
        rowHeight,
        backgroundColor,
        fontSize,
        padding
    } = props
    const word = prepared[wordIndex]
    word.selected = selected
    const updatedRow = rows.findIndex(r => r.includes(wordIndex))
    const row = rows[updatedRow]
    rowCtx.fillStyle = `#${backgroundColor}`
    rowCtx.fillRect(0, 0, width, rowHeight)
    row.forEach(wi => {
        const { word, color, x, y, selected, wordWidth } = prepared[wi]
        if (selected) {
            rowCtx.fillStyle = 'black'
            rowCtx.fillRect(x, fontSize + 1, wordWidth, 2)
            SetFont(props, rowCtx, {
                fontStyle: 'italic'
            })
            rowCtx.fillStyle = 'black'
            if (trackSelected) {
                const st = y > height / 2 ? y - height / 2 : 0
                storedScrollTop = st
            }
        } else {
            rowCtx.fillStyle = color
            SetFont(props, rowCtx)
        }
        rowCtx.fillText(word, x, fontSize)
    })
    const rowImageData = rowCtx.getImageData(0, 0, width, rowHeight).data
    let i = updatedRow
    const [pt, pr, pb, pl] = padding
    // for (let l = 0; l < rowHeight; l++) {
    //     const ind = Math.floor((i * rowHeight + l + pt) / blockHeight)
    //     const line = (i * rowHeight + l + pt) % blockHeight
    //     const sub = rowsImageData[i].subarray(l * s, l * s + s)
    //     const to = (line * s * texturesNumber) + (ind * s)
    //     ca.set(sub, to)
    // }
    // const firstInd = Math.floor((i * rowHeight + pt) / blockHeight)
    // const firstLine = (i * rowHeight + pt) % blockHeight
    // const to = (firstLine * s * texturesNumber) + (firstInd * s)
    // const offsetY = updatedRow * rowHeight + pt
    const offsetY = i * rowHeight + pt
    const firstInd = Math.floor(offsetY / blockHeight)
    const firstLine = offsetY % blockHeight
    ca.set(rowImageData, offsetY * s)

    if (firstLine > blockHeight - rowHeight) {
        const firstPartLine = blockHeight - firstLine
        const firstPart = rowImageData.subarray(0, s * firstPartLine)
        const secondPartLine = rowHeight - firstPartLine
        const secondPart = rowImageData.subarray(s * firstPartLine)
        GL.texSubImage2D(GL.TEXTURE_2D, 0, firstInd * width, firstLine, width, firstPartLine, GL.RGBA, GL.UNSIGNED_BYTE, firstPart)
        GL.texSubImage2D(GL.TEXTURE_2D, 0, (firstInd + 1) * width, 0, width, secondPartLine, GL.RGBA, GL.UNSIGNED_BYTE, secondPart)
    } else {
        GL.texSubImage2D(GL.TEXTURE_2D, 0, firstInd * width, firstLine, width, rowHeight, GL.RGBA, GL.UNSIGNED_BYTE, rowImageData)
    }

    postMessage({ type: 'Updated', storedScrollTop })
}
function initTextures() {
    const {
        width,
        startTime,
        rowHeight
    } = props
    //Textures
    let textureLoc = GL.getUniformLocation(shaderProgram, 'u_textures[0]')
    GL.uniform1iv(textureLoc, [0])

    let texWidth = width * texturesNumber
    const texture = GL.createTexture()
    GL.bindTexture(GL.TEXTURE_2D, texture)
    console.log('init texture 1', new Date().getTime())
    //Slow place ~400ms with max texture size
    // GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, texWidth, blockHeight, 0,
    //     GL.RGBA, GL.UNSIGNED_BYTE, ca)
    // let offsetY = 0
    // let rowsDraw = 2
    // const nca = ca.subarray(0, 0 + texWidth * rowHeight * 4 * rowsDraw)
    // console.log(texWidth, blockHeight)
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, texWidth, blockHeight, 0,
        GL.RGBA, GL.UNSIGNED_BYTE, null)
    // GL.texSubImage2D(GL.TEXTURE_2D, 0, 0, offsetY, texWidth, rowHeight * rowsDraw, GL.RGBA, GL.UNSIGNED_BYTE, nca)
    ///////////////////////
    console.log('init texture 2', new Date().getTime())
    // for (let i = 0; i < 10000000000; i++) {
    //     const wait = i
    // }
    // console.log('init texture 3', new Date().getTime())
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST)

    console.log('Texture time: ', new Date().getTime() - startTime)
}
function drawCycle() {
    const {
        fps,
        width,
        height,
        startTime,
        backgroundColor,
    } = props
    GL.viewportWidth = width
    GL.viewportHeight = height
    shaderProgram = initShaders(GL)
    console.log('Shader init time: ', new Date().getTime() - startTime)
    initTextures()

    GL.useProgram(shaderProgram)

    GL.clearColor(0.0, 0.0, 0.0, 1.0)
    GL.viewport(0, 0, GL.viewportWidth, GL.viewportHeight)
    GL.clear(GL.COLOR_BUFFER_BIT)

    // let timeLocation = GL.getUniformLocation(shaderProgram, 'iTime')
    let scrolledLocation = GL.getUniformLocation(shaderProgram, 'scrolled')
    let viewportWidth = GL.getUniformLocation(shaderProgram, 'viewportWidth')
    let viewportHeight = GL.getUniformLocation(shaderProgram, 'viewportHeight')
    let numTextures = GL.getUniformLocation(shaderProgram, 'numTextures')
    let backgroundUniform = GL.getUniformLocation(shaderProgram, 'backgroundColor')

    const indexBuffer = initBuffers(GL, shaderProgram)

    const beforeRenderTime = new Date().getTime()
    let prevTime = beforeRenderTime
    let drawsCounter = 1
    let sum = 0
    const render = () => {
        GL.clear(GL.COLOR_BUFFER_BIT)
        GL.useProgram(shaderProgram)
        GL.viewport(0, 0, GL.viewportWidth, GL.viewportHeight)
        // let iTime = (new Date().getTime() - beforeRenderTime) / 1000
        // console.log(iTime)
        GL.uniform4fv(backgroundUniform, hexToVec(backgroundColor, 1.0))
        // GL.uniform1f(timeLocation, iTime)
        GL.uniform1f(scrolledLocation, storedScrollTop)
        GL.uniform1f(viewportWidth, width)
        GL.uniform1f(viewportHeight, blockHeight)
        GL.uniform1i(numTextures, texturesNumber)

        GL.drawElements(GL.TRIANGLE_STRIP, indexBuffer.numberOfItems, GL.UNSIGNED_SHORT, 0)
        let currentTime = new Date().getTime()
        let cFps = 1000 / (currentTime - prevTime)
        sum += Math.round(cFps < 90 ? cFps : 90)
        if (fps) {
            postMessage({ type: 'FPS', fps: 'FPS: ' + Math.round(sum / drawsCounter) })
        }
        prevTime = currentTime
        drawsCounter++
        if (drawsCounter > 60) {
            drawsCounter = 1
            sum = 0
        }
        rafID = requestAnimationFrame(render)
    }
    // postMessage({ type: 'Ready' })
    // onReady(this)
    rafID = requestAnimationFrame(render)

    postMessage({ type: 'Canvas-Ready' })
}
onmessage = function (event) {
    switch (event.data.type) {
        case 'Draw':
            drawData(event.data)
            break
        case 'Update':
            updateData(event.data)
            break
        case 'Scroll':
            storedScrollTop = event.data.storedScrollTop
            break
        case 'Select':
            const { x, y } = event.data
            const {
                fontSize,
                // padding,
            } = props
            // const [pt, pr, pb, pl] = padding
            // const ind = pt - fontSize / 2
            const sY = storedScrollTop + y
            const selectedIndex = prepared.findIndex(w => {
                const {
                    x: xPos,
                    y: yPos,
                    wordWidth
                } = w
                // console.log(ind, y, pt, yPos, fontSize)
                if (x >= xPos && x <= xPos + wordWidth &&
                    sY >= yPos && sY < yPos + fontSize) {
                    return true
                }
            })
            console.log(x, y, selectedIndex)
            if (selectedIndex > -1) {
                postMessage({ type: 'Select-Index', selectedIndex })
            }
            break
        case 'Select-Text':
            const { startPosition, movePosition } = event.data
            const {
                // fontSize,
                // padding,
                height
            } = props
            const { x: x1, y: y1 } = movePosition
            // console.log(movePosition.x, movePosition.y)
            if (y1 > height) {
                storedScrollTop = y1 - height
                postMessage({ type: 'Text-Selected', storedScrollTop })
            }
            break
        case 'Dismount':
            cancelAnimationFrame(rafID)
            GL = null
            break
    }
}