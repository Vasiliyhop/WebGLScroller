import { SetFont } from '../utils/measureUtils'
import getLogger from '../utils/logger'
let props
onmessage = function (event) {
    const {
        rows,
        prepared,
        backgroundColor,
        width,
        rowHeight,
        blockHeight,
        fontSize,
        letterSpacing,
        padding,
        s,
        caBuff,
        texturesNumber,
        t,
        availableThreads,
        loggerSettings,
    } = event.data
    let Logger = getLogger(loggerSettings)
    props = event.data
    const [pt, pr, pb, pl] = padding

    Logger(`Thread ${t} is working: `, { fromMark: 'thread-create', fromStart: true, secondColor: true })

    const rowCanvas = new OffscreenCanvas(width, rowHeight)
    const rowCtx = rowCanvas.getContext('2d')
    const ca = new Uint8ClampedArray(caBuff)
    let texWidth = width * texturesNumber
    for (let i = t; i < rows.length; i += availableThreads) {
        const row = rows[i]
        if (row[0] === -1) {
            postMessage({ type: 'Set', draw: false })
            continue
        }
        rowCtx.fillStyle = `${backgroundColor}`
        rowCtx.fillRect(0, 0, width, rowHeight)
        row.forEach(wi => {
            const { word, color, x } = prepared[wi]
            rowCtx.fillStyle = color
            SetFont(props, rowCtx)
            if (letterSpacing > 0) {
                let s = x
                word.split('').forEach((l) => {
                    rowCtx.fillText(l, s, fontSize)
                    let { width } = rowCtx.measureText(l)
                    s += width + letterSpacing
                })
            } else {
                rowCtx.fillText(word, x, fontSize)
            }
        })
        const rowImageData = rowCtx.getImageData(0, 0, width, rowHeight).data
        // for (let l = 0; l < rowHeight; l++) {
        //     const ind = Math.floor((i * rowHeight + l + pt) / blockHeight)
        //     const line = (i * rowHeight + l + pt) % blockHeight
        //     const sub = rowImageData.subarray(l * s, l * s + s)
        //     const to = (line * s * texturesNumber) + (ind * s)
        //     ca.set(sub, to)
        // }
        const offsetY = i * rowHeight + pt
        const firstInd = Math.floor(offsetY / blockHeight)
        const firstLine = offsetY % blockHeight
        ca.set(rowImageData, offsetY * s)
        // const to = (firstLine * s * texturesNumber) + (firstInd * s)
        // const nca = ca.subarray(to, to + texWidth * rowHeight * 4)
        postMessage({ type: 'Set', draw: true, offsetY, firstLine, firstInd })
    }
    postMessage({ type: 'Thread-Done', t })
}