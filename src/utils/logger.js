import * as R from 'Ramda'
const sizes = {
    sm: {
        padding: 2,
        fontSize: 12,
        fontWeight: 900,
        border: null
    },
    md: {
        padding: 5,
        fontSize: 14,
        fontWeight: 600,
        border: 1
    },
    lg: {
        padding: 10,
        fontSize: 28,
        fontWeight: 400,
        border: 2
    }
}
function getStyles(options = {}, theme, secondColor) {
    const {
        size = 'sm'
    } = options
    const {
        padding,
        fontSize,
        fontWeight,
        border
    } = sizes[size]
    const [
        regular,
        name,
        last,
        upper,
        enter,
        background
    ] = theme
    const color = secondColor ? '#fff' : regular
    const backgroundColor = secondColor ? upper : background
    const marginLeft = secondColor ? padding : 0
    const p = secondColor ? `${padding}px ${padding * 2}px ${padding}px ${padding * 2}px` : `${padding}px`
    return `
        padding: ${p}; 
        margin-left: ${marginLeft}px;
        background-color: ${backgroundColor}; 
        color: ${color}; 
        font-family: Roboto;
        font-size: ${fontSize}px;
        font-weight: ${fontWeight};
        ${border ? `border: ${border}px solid ${last};` : 'none'}
    `
}
function getDivider(theme) {
    const [
        regular,
        name,
        last,
        upper,
        enter,
        background
    ] = theme
    const { fontSize } = sizes['md']
    const deviderStyles = `
        color: ${enter};
        font-size: ${fontSize}px;
    `
    const l = 34
    console.log(`%c${'–'.repeat(l)}`, deviderStyles)
}
const getTime = () => new Date().getTime()
function getLogger(options = {}) {
    const defaults = {
        startTime: getTime(),
        lastTime: getTime(),
        resetMessage: '',
        marks: {},
        clear: true,
        showLog: true,
        theme: ['#967102', '#E86E04', '#00818a', '#216583', '#293462', '#B5C5C5']
    }
    const settings = R.merge(defaults, options)
    settings.clear && settings.showLog && console.clear()
    function ms(time) {
        return ` ${time.toFixed(2)} ms `
    }
    const d = '  |  '
    const Logger = (text, options = {}) => {
        const {
            fromStart,
            fromLast,
            fromMark,
            mark,
            divider,
            secondColor,
        } = options
        const {
            startTime,
            lastTime,
            marks,
            theme,
            showLog,
            resetMessage,
        } = settings
        if (!showLog) return
        if (divider) {
            return getDivider(theme)
        }
        const now = getTime()
        if (mark) {
            marks[mark] = now
        }
        if (!text) return
        const m = fromMark ? marks[fromMark] : 0
        let measure = fromLast ? `${ms(now - lastTime)} ${fromMark ? d : ''}` : ''
        measure += fromMark ? `${ms(now - m)} ${fromStart ? d : ''}` : ''
        measure += fromStart ? `${ms(now - startTime)}` : ''
        const styles = getStyles(options, theme)
        const secondStyles = secondColor ? getStyles(options, theme, secondColor) : ''
        const secondMark = secondColor ? '%c' : ''
        console.log(`%c<<< ${resetMessage + text} ${secondMark}${measure}`, styles, secondStyles)
        settings.lastTime = now
    }
    Logger.getSettings = () => {
        return { ...settings, clear: false }
    }
    Logger.group = (name) => {
        const n = settings.resetMessage + name
        settings.showLog && console.group(n)
    }
    Logger.groupEnd = (name) => {
        const n = settings.resetMessage + name
        settings.showLog && console.groupEnd(n)
    }
    Logger.table = (data) => {
        settings.showLog && console.table(data)
    }
    Logger.reset = (resetMessage = '') => {
        settings.startTime = getTime()
        settings.lastTime = getTime()
        settings.marks = {}
        settings.resetMessage = resetMessage
    }
    return Logger
}

export default getLogger