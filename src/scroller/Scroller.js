import * as R from 'Ramda'
import DrawWorker from '../workers/draw.worker.js'

function GetScroller() {
    let GL
    const defaults = {
        storedScrollTop: 0,
        selectedIndex: null,
        texturesNumber: 1,
        blockHeight: 0,
        maxBlockHeight: 16384,
        props: {},
        scrollDispatched: false,
        stage: 'init'
    }
    class Scroller {
        constructor() {
            Object.assign(this, defaults)
        }
        init(props) {
            const {
                width,
                height,
                fontSize,
                lineIndent,
                canvasRef,
                scrollRef,
                dummyRef,
                containerRef,
                onInitialized,
                Logger,
                theme,
            } = props

            Logger.group('Scrollable canvas group')
            Logger('Scrollable Canvas', { size: 'lg' })

            this.Logger = Logger
            this.theme = theme
            this.props = R.mergeAll([this.props, props])
            this.rowHeight = fontSize + lineIndent
            this.dummy = dummyRef.current
            containerRef.current.style.backgroundColor = theme[5]
            this.scrollContainer = scrollRef.current
            this.scrollContainer.style.width = width + 10 + 'px'
            this.scrollContainer.style.height = height - 20 + 'px'
            this.scrollContainer.addEventListener('scroll', this.scroll.bind(this))
            // this.onDismount = this.onDismount.bind(this)

            const canvas = canvasRef.current
            this.offscreen = canvas.transferControlToOffscreen()

            onInitialized(this)
            return this
        }
        resize(textData) {
            this.props.onResize()
            this.props.width = this.dummy.offsetWidth
            this.props.height = this.scrollContainer.offsetHeight + 20
            this.scrollContainer.style.width = this.props.width + 10 + 'px'
            //..................
            const {
                width,
                height,
                Logger,
            } = this.props
            Logger.reset('Resize | ')
            Logger.group('Scrollable canvas group')
            Logger(null, { divider: true })
            this.stage = 'reset'
            this.backgroundColor = textData.background

            //Measure dummy
            Logger('Started', { mark: 'measure' })
            this.fullHeight = this.dummy.offsetHeight
            const nodes = this.dummy.childNodes
            var range = document.createRange()
            let { top: containerTop, left: containerLeft } = this.dummy.getBoundingClientRect()
            const words = [...textData.words]
            let wordIndex = 0
            let rows = []
            let rowsCounter = 0
            const regexParse = RegExp(/[\s\-]+/g)
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i]
                var textContent = node.textContent
                if (!textContent) {
                    const prev = nodes[i - 1]
                    if (!prev.textContent) {
                        rows[rowsCounter] = [-1]
                        rowsCounter++
                    }
                    continue
                } else {
                    rows[rowsCounter] = []
                }

                let execResult
                let storedIndex = 0
                let storedTop = null
                while ((execResult = regexParse.exec(textContent + ' ')) !== null) {
                    const {
                        index,
                        [0]: marks
                    } = execResult
                    const l = index + marks.length
                    const w = textContent.substring(storedIndex, index)
                    range.setStart(node, storedIndex)
                    range.setEnd(node, index)
                    let { top, left, width } = range.getBoundingClientRect()
                    let offsetX = left - containerLeft
                    let offsetY = top - containerTop
                    if (storedTop === null) {
                        storedTop = offsetY
                    } else if (offsetY > storedTop) {
                        storedTop = offsetY
                        rowsCounter++
                        rows[rowsCounter] = []
                    }
                    if (!w) {
                        storedIndex = l
                        continue
                    }
                    let processed = words[wordIndex]
                    processed.x = offsetX
                    processed.y = offsetY
                    processed.wordWidth = width
                    processed.selected = false
                    rows[rowsCounter].push(wordIndex)
                    wordIndex++
                    storedIndex = l
                }
                rowsCounter++
            }
            Logger('Measure dummy time:', { fromMark: 'measure', secondColor: true })

            //draw worker

            const workerProps = {
                processed: words,
                pRows: rows,
                width,
                height,
                resize: true,
                type: 'Resize',
                offsetHeight: this.fullHeight,
            }
            this.drawWorker.postMessage(workerProps)

            //..................
        }
        prepareData(textData) {
            const {
                width,
                height,
                align,
                fontStyle,
                fontWeight,
                fontSize,
                fontFamily,
                lineIndent,
                padding,
                cpuCores,
                onReady,
                onCanvasReady,
                fps,
                fpsRef,
                onPlayWord,
                letterSpacing,
                Logger,
                theme,
            } = this.props
            this.stage = 'preparation'
            this.backgroundColor = textData.background

            //Measure dummy
            Logger(null, { mark: 'measure' })
            this.dummy.style.letterSpacing = `${letterSpacing}px`
            this.dummy.innerText = textData.text
            this.fullHeight = this.dummy.offsetHeight
            const nodes = this.dummy.childNodes
            var range = document.createRange()
            let { top: containerTop, left: containerLeft } = this.dummy.getBoundingClientRect()
            const words = [...textData.words]
            let wordIndex = 0
            let rows = []
            let rowsCounter = 0
            const regexParse = RegExp(/[\s\-]+/g)
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i]
                var textContent = node.textContent
                if (!textContent) {
                    const prev = nodes[i - 1]
                    if (!prev.textContent) {
                        rows[rowsCounter] = [-1]
                        rowsCounter++
                    }
                    continue
                } else {
                    rows[rowsCounter] = []
                }

                let execResult
                let storedIndex = 0
                let storedTop = null
                while ((execResult = regexParse.exec(textContent + ' ')) !== null) {
                    const {
                        index,
                        [0]: marks
                    } = execResult
                    const l = index + marks.length
                    const w = textContent.substring(storedIndex, index)
                    range.setStart(node, storedIndex)
                    range.setEnd(node, index)
                    let { top, left, width } = range.getBoundingClientRect()
                    let offsetX = left - containerLeft
                    let offsetY = top - containerTop
                    if (storedTop === null) {
                        storedTop = offsetY
                    } else if (offsetY > storedTop) {
                        storedTop = offsetY
                        rowsCounter++
                        rows[rowsCounter] = []
                    }
                    if (!w) {
                        storedIndex = l
                        continue
                    }
                    let processed = words[wordIndex]
                    processed.x = offsetX
                    processed.y = offsetY
                    processed.wordWidth = width
                    processed.selected = false
                    rows[rowsCounter].push(wordIndex)
                    wordIndex++
                    storedIndex = l
                }
                rowsCounter++
            }
            Logger('Measure dummy time:', { fromMark: 'measure', secondColor: true })

            //draw worker
            this.drawWorker = new DrawWorker()

            Logger(`Worker create time: `, { fromStart: true, secondColor: true })

            Logger(null, { divider: true })
            Logger(null, { mark: 'worker-create' })
            const workerProps = {
                loggerSettings: Logger.getSettings(),
                processed: words,
                pRows: rows,
                width,
                height,
                fontStyle,
                fontWeight,
                fontSize,
                fontFamily,
                align,
                lineIndent,
                letterSpacing,
                padding,
                rowHeight: this.rowHeight,
                backgroundColor: this.backgroundColor,
                maxBlockHeight: this.maxBlockHeight,
                cpuCores,
                type: 'Draw',
                offscreen: this.offscreen,
                fps,
                offsetHeight: this.fullHeight,
                theme,
            }
            this.drawWorker.postMessage(workerProps, [this.offscreen])

            this.drawWorker.onmessage = (event) => {
                switch (event.data.type) {
                    case 'Canvas-Ready':
                        setTimeout(onCanvasReady, 100)
                        break;
                    case 'FPS':
                        const fpsEl = fpsRef.current
                        fpsEl && (fpsEl.innerText = event.data.fps)
                        break;
                    case 'Drawn':
                        this.blockHeight = event.data.blockHeight
                        this.texturesNumber = event.data.texturesNumber

                        Logger(`Worker end time: `, { fromStart: true, secondColor: true })

                        if (this.texturesNumber * width > this.maxBlockHeight) {
                            throw new Error('Texture is too big!!! Reduce Text length!!!')
                        }

                        Logger(null, { divider: true })

                        onReady(this)
                        break
                    case 'Progress':
                        this.props.onProgressChange(event.data)
                        break
                    case 'Ready':
                        // onReady(this)
                        break
                    case 'Select-Index':
                        this.updateWord(event.data.selectedIndex)
                        onPlayWord(event.data.selectedIndex)
                        break;
                    case 'Updated':
                        if (this.props.trackSelected) {
                            this.storedScrollTop = event.data.storedScrollTop
                            this.scrollDispatched = true
                            this.scrollContainer.scrollTop = this.storedScrollTop
                        }
                        break
                    case 'Text-Selected':
                        this.scrollContainer.scrollTop = event.data.storedScrollTop
                        break
                }
            }
            //end of worker
        }
        setTrackSelected(trackSelected) {
            this.props.trackSelected = trackSelected
        }
        updateWord(wordIndex) {
            const {
                trackSelected
            } = this.props
            if (wordIndex === -1) return
            const workerProps = {
                wordIndex,
                selected: true,
                trackSelected,
                type: 'Update'
            }
            if (this.selectedIndex !== null) {
                this.drawWorker.postMessage(R.merge(workerProps, {
                    wordIndex: this.selectedIndex,
                    selected: false
                }))
            }
            this.selectedIndex = wordIndex
            this.drawWorker.postMessage(workerProps)
        }
        selectWord({ x, y }) {
            const workerProps = {
                x,
                y,
                type: 'Select'
            }
            this.drawWorker.postMessage(workerProps)
        }
        onDismount() {
            this.drawWorker.postMessage({ type: 'Dismount' })
        }
        scroll(e) {
            const {
                onScrollTriggered
            } = this.props
            this.storedScrollTop = this.scrollContainer.scrollTop
            if (!this.scrollDispatched) {
                onScrollTriggered(e, this.storedScrollTop)
            } else {
                this.scrollDispatched = false
            }
            this.drawWorker.postMessage({ type: 'Scroll', storedScrollTop: this.storedScrollTop })
        }
    }

    return new Scroller()
}

export default GetScroller