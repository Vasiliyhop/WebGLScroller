import { SetFont } from '../utils/measureUtils'
import ThreadWorker from './draw.thread.worker.js'
import { initShaders, initBuffers } from '../utils/shaderUtils'
import { hexToVec } from '../utils/textUtils'
import getLogger from '../utils/logger'

const b = 4 //bytes per color
let props = {}
let rowCanvas
let rowCtx
let rows
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
let Logger

function drawData(data) {
    const {
        width,
        height,
        rowHeight,
        backgroundColor,
        fontStyle,
        fontWeight,
        fontSize,
        fontFamily,
        letterSpacing,
        padding,
        maxBlockHeight,
        cpuCores,
        offscreen,
        processed,
        pRows,
        offsetHeight,
        theme,
        loggerSettings,
        resize,
    } = data

    if (!resize) {
        Logger = getLogger(loggerSettings)
        Logger(null, { mark: 'start-worker' })
        GL = offscreen.getContext('webgl')

        Logger(null, { divider: true })

        Logger(`Worker init time: `, { fromMark: 'worker-create', fromStart: true, secondColor: true })

        rowCanvas = new OffscreenCanvas(width, rowHeight)
        rowCtx = rowCanvas.getContext('2d')
        props = data

        SetFont(props, rowCtx)
    } else {
        rowCanvas.width = width
        offscreen.width = width
        offscreen.height = height
    }

    fullHeight = offsetHeight
    rows = pRows
    prepared = processed
    blockHeight = fullHeight > maxBlockHeight ? maxBlockHeight : fullHeight
    texturesNumber = Math.floor(fullHeight / blockHeight) + 1

    const [pt, pr, pb, pl] = padding
    rowsLength = rows.length
    s = width * b
    let caLength = fullHeight * s
    caBuff = new SharedArrayBuffer(caLength)
    ca = new Uint8ClampedArray(caBuff)

    //Create threads workers
    Logger(null, { mark: 'thread-create' })
    const availableThreads = cpuCores / 2
    const tenth = Math.floor(rowsLength / 100)
    let progress = 0

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
        letterSpacing,
        padding,
        s,
        caBuff,
        texturesNumber,
        availableThreads,
        tenth,
        theme,
        loggerSettings: Logger.getSettings(),
    }
    const threadWorkers = []
    let threadsDone = 0
    let texWidth = width * texturesNumber
    let setCounter = 0
    let storedProgress = progress
    Logger.table([
        { Prop: 'Width', Value: width },
        { Prop: 'Height', Value: height },
        { Prop: 'Full height', Value: fullHeight },
        { Prop: 'Textures number', Value: texturesNumber },
        { Prop: 'Rows number', Value: rows.length },
        { Prop: 'CA length', Value: caLength }
    ])
    Logger.group(`Create ${availableThreads} Threads Workers`)
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

                    Logger(`Thread ${threadId} is Ready: `, { fromMark: 'thread-create', fromStart: true, secondColor: true })

                    threadWorkers[threadId].terminate()
                    threadsDone++
                    if (threadsDone === availableThreads) {
                        Logger.groupEnd(`Waiting for ${availableThreads} Threads Workers`)
                        postMessage({ type: 'Drawn', fullHeight, blockHeight, texturesNumber })
                    }
                    break
            }
        }

        Logger(`Thread ${t} ping ... : `, { fromMark: 'thread-create', fromStart: true, secondColor: true })
        threadWorkers[t].postMessage(threadProps)
    }
    Logger.groupEnd(`Create ${availableThreads} Threads Workers`)
    if (!resize) {
        drawCycle()
    } else {
        GL.viewportWidth = width
        GL.viewportHeight = height
        initTextures()

        GL.clearColor(0.0, 0.0, 0.0, 1.0)
        GL.viewport(0, 0, GL.viewportWidth, GL.viewportHeight)
        GL.clear(GL.COLOR_BUFFER_BIT)
        cancelAnimationFrame(rafID)
        onRender()
    }
    Logger.group(`Waiting for ${availableThreads} Threads Workers`)
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
    rowCtx.fillStyle = `${backgroundColor}`
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
        width
    } = props
    let textureLoc = GL.getUniformLocation(shaderProgram, 'u_textures[0]')
    GL.uniform1iv(textureLoc, [0])
    let texWidth = width * texturesNumber
    const texture = GL.createTexture()
    GL.bindTexture(GL.TEXTURE_2D, texture)
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, texWidth, blockHeight, 0,
        GL.RGBA, GL.UNSIGNED_BYTE, null)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST)
}
let scrolledLocation
let viewportWidth
let viewportHeight
let numTextures
let backgroundUniform
let indexBuffer
function drawCycle() {
    const {
        fps,
        width,
        height,
        backgroundColor,
    } = props
    GL.viewportWidth = width
    GL.viewportHeight = height
    shaderProgram = initShaders(GL)
    initTextures()

    GL.useProgram(shaderProgram)

    GL.clearColor(0.0, 0.0, 0.0, 1.0)
    GL.viewport(0, 0, GL.viewportWidth, GL.viewportHeight)
    GL.clear(GL.COLOR_BUFFER_BIT)

    // let timeLocation = GL.getUniformLocation(shaderProgram, 'iTime')
    scrolledLocation = GL.getUniformLocation(shaderProgram, 'scrolled')
    viewportWidth = GL.getUniformLocation(shaderProgram, 'viewportWidth')
    viewportHeight = GL.getUniformLocation(shaderProgram, 'viewportHeight')
    numTextures = GL.getUniformLocation(shaderProgram, 'numTextures')
    backgroundUniform = GL.getUniformLocation(shaderProgram, 'backgroundColor')

    indexBuffer = initBuffers(GL, shaderProgram)

    onRender()

    postMessage({ type: 'Canvas-Ready' })
}
function onRender() {
    const {
        fps,
        width,
        height,
        backgroundColor,
    } = props
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
    rafID = requestAnimationFrame(render)
}
function selectWord(data) {
    const { x, y } = data
    const {
        fontSize
    } = props
    const sY = storedScrollTop + y
    const selectedIndex = prepared.findIndex(w => {
        const {
            x: xPos,
            y: yPos,
            wordWidth
        } = w
        if (x >= xPos && x <= xPos + wordWidth &&
            sY >= yPos && sY < yPos + fontSize) {
            return true
        }
    })
    if (selectedIndex > -1) {
        postMessage({ type: 'Select-Index', selectedIndex })
    }
}
onmessage = function (event) {
    switch (event.data.type) {
        case 'Draw':
            drawData(event.data)
            break
        case 'Resize':
            Logger.reset('Resize | ')
            Object.assign(props, event.data)
            drawData(props)
            break
        case 'Update':
            updateData(event.data)
            break
        case 'Scroll':
            storedScrollTop = event.data.storedScrollTop
            break
        case 'Select':
            selectWord(event.data)
            break
        case 'Dismount':
            cancelAnimationFrame(rafID)
            GL = null
            break
    }
}