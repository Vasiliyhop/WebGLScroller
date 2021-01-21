function hexToRGBA(hex, alpha) {
    let h = hex.slice(1),
        r = parseInt(h.slice(0, 2), 16),
        g = parseInt(h.slice(2, 4), 16),
        b = parseInt(h.slice(4, 6), 16)

    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
function hexToVec(hex, a) {
    let h = hex.slice(1),
        r = parseInt(h.slice(0, 2), 16) / 255,
        g = parseInt(h.slice(2, 4), 16) / 255,
        b = parseInt(h.slice(4, 6), 16) / 255

    return [r, g, b, a]
}
function getTheme() {
    const themes = [
        // ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#FFFFFF'],
        // ['#0F0F0F', '#DADADA', '#FF0095', '#00FFFF', '#3F59DA', '#D5B5B5'],
        ['#F4F4F2', '#94A0BE', '#067E79', '#8B2635', '#080926', '#D5C5D5'],
        // ['#F9FD50', '#00BD56', '#00BD56', '#207DFF', '#0F3974', '#B5B5B5'],
        // ['#DDCA7D', '#B88B4A', '#A27035', '#533E2D', '#242331', '#B5B5B5'],
        ['#967102', '#E86E04', '#00818a', '#216583', '#293462', '#B5C5C5'],
    ]
    return themes[Math.floor(Math.random() * themes.length)]
}
function fetchText(textData, colors, Logger) {
    Logger.table([
        { Text: 'Regular', Color: colors[0] },
        { Text: 'Name', Color: colors[1] },
        { Text: 'Last', Color: colors[2] },
        { Text: 'Upper', Color: colors[3] },
        { Text: 'Enter', Color: colors[4] },
        { Text: 'Background', Color: colors[5] }
    ])
    const names = ['Tom', 'Sid', 'Sawyer', 'Polly', 'Huckleberry', 'Finn', 'Jim', 'Becky', 'Thatcher', 'Joe', 'Harper', 'Mary', 'Injun'].map(n => n.toUpperCase())
    const regexParse = RegExp(/[\s\-]+/g)
    const regexEnter = RegExp(/[\r\n]+/)
    const regexUpper = RegExp(/^[A-Z]/)
    const regexLast = RegExp(/.*[?!\.]$/)
    const words = []
    let execResult
    let storedIndex = 0
    while ((execResult = regexParse.exec(textData + ' ')) !== null) {
        const {
            index,
            [0]: marks
        } = execResult
        const l = marks.length
        const w = textData.substring(storedIndex, index)
        const wr = w.replace(/[^a-zA-Z]+/g, '')
        const enter = regexEnter.test(marks)
        const upper = regexUpper.test(wr)
        const last = regexLast.test(w) || regexParse.lastIndex - 1 === textData.length
        const name = names.includes(wr.toUpperCase()) && upper
        const color = name ? colors[1] : last ? colors[2] : upper ? colors[3] : enter > 0 ? colors[4] : colors[0]
        if (marks === '-') w += '-'
        const word = {
            word: w,
            enter: enter ? marks.length : 0,
            upper,
            last,
            name,
            color: hexToRGBA(color, Math.random() * 0.5 + 0.5)
        }
        // debugger
        words.push(word)
        storedIndex = index + l
    }
    return {
        words,
        background: colors[5],
        text: textData,
    }
}

export {
    getTheme,
    fetchText,
    hexToVec
}