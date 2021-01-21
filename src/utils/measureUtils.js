function MeasureText(ctx, width, words, align, fontSize, lineIndent, padding) {
    let prepared = []
    const rows = []
    const lines = []
    let fullHeight = 0
    let lineCount = 0
    const [pt, pr, pb, pl] = padding
    const lw = width - pl - pr
    let lineFilled = pl
    lines[lineCount] = ''
    rows[lineCount] = []
    const lineHeight = fontSize + lineIndent
    let nextEnter = false
    const spaceSize = ctx.measureText(' ').width
    const wordsLength = words.length
    const tenth = Math.floor(wordsLength / 10)
    let progress = 0
    words.forEach((w, index) => {
        const { word, color, enter } = w
        let text = ctx.measureText(word)
        const wordWidth = text.width
        const e = nextEnter || lineFilled + wordWidth >= lw
        nextEnter = enter
        if (e) {
            lineFilled = pl
            lineCount++
            lines[lineCount] = ''
            if (e > 1) {
                rows[lineCount] = [-1]
                lineCount++
                lines[lineCount] = ''
            }
            rows[lineCount] = [index]
        } else {
            rows[lineCount].push(index)
        }
        lines[lineCount] += lines[lineCount] === '' ? word : ' ' + word
        const yPos = fontSize + (lineCount * lineHeight)
        if (fullHeight < yPos) fullHeight = yPos + lineIndent
        prepared.push({
            word: word,
            x: lineFilled,
            y: yPos,
            color: color,
            wordWidth: wordWidth,
            selected: false,
        })
        lineFilled += wordWidth + spaceSize
        const last = index === wordsLength - 1
        if (e || last) {
            let minus = last ? 0 : e > 1 ? e : 1
            let l = lines[lineCount - minus]
            let c = l.includes('CHAPTER') || last
            if (align !== 'left' || c) {
                let lineWidth = ctx.measureText(lines[lineCount - minus]).width
                let ind
                if (align === 'center' || c) {
                    ind = Math.ceil(Math.max((lw - lineWidth) / 2, 0))
                } else if (align === 'right') {
                    ind = Math.ceil(Math.max((lw - lineWidth), 0))
                }
                let len = lines[lineCount - minus].split(' ').length
                for (let i = prepared.length - len - (last ? 0 : 1); i < prepared.length - 1; i++) {
                    // console.log(i, minus)
                    prepared[i].x += ind
                }
                if (last) {
                    prepared[wordsLength - 1].x += ind
                }
            }
        }
        const tenthCounter = (index + 1) % tenth
        if (tenthCounter === 0) {
            progress++
            postMessage({ type: 'Progress', progress, stage: 'Measure stage' })
        }
    })
    fullHeight += pt + pb

    return {
        prepared,
        fullHeight,
        rows
    }
}

function SetFont(props, ctx, {
    fontStyle: ft,
    fontWeight: fw,
    fontSize: fs,
    fontFamily: ff,
} = {}) {
    const {
        fontStyle,
        fontWeight,
        fontSize,
        fontFamily,
    } = props
    const nft = ft ? ft : fontStyle
    const nfw = fw ? fw : fontWeight
    const nfs = fs ? fs : fontSize
    const nff = ff ? ff : fontFamily
    ctx.font = `${nft} ${nfw} ${nfs}px ${nff}`
}


export {
    MeasureText,
    SetFont
}