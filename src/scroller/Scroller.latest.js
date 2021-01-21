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
                scrollRef,
                dummyRef,
                onInitialized,
            } = props
            this.props = R.mergeAll([this.props, props])

            this.rowHeight = fontSize + lineIndent
            this.dummy = dummyRef.current
            this.scrollContainer = scrollRef.current
            this.scrollContainer.style.width = width + 15 + 'px'
            this.scrollContainer.style.height = height + lineIndent + 'px'
            this.scrollContainer.addEventListener('scroll', this.scroll.bind(this))
            // this.onDismount = this.onDismount.bind(this)

            onInitialized(this)
            return this
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
                startTime,
                cpuCores,
                canvasRef,
                onReady,
                onCanvasReady,
                fps,
                fpsRef,
                onPlayWord,
            } = this.props
            this.stage = 'preparation'
            this.backgroundColor = textData.background

            const canvas = canvasRef.current
            const offscreen = canvas.transferControlToOffscreen()

            //Measure dummy
            console.log(new Date().getTime())
            this.dummy.innerText = textData.text
            const nodes = this.dummy.childNodes
            var range = document.createRange()
            let start = 0
            let end = 0
            let { top: containerTop, left: containerLeft } = this.dummy.getBoundingClientRect()
            const words = [...textData.words]
            let wordIndex = 0
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i]
                var textContent = node.textContent
                if (!textContent) continue
                const row = textContent.split(' ')
                start = 0
                for (let w = 0; w < row.length; w++) {
                    const word = row[w]
                    end = start + word.length
                    if (!word.trim()) {
                        continue
                    }
                    range.setStart(node, start)
                    range.setEnd(node, end)
                    let { top, left, width } = range.getBoundingClientRect()
                    let offsetX = left - containerLeft
                    let offsetY = top - containerTop
                    let processed = words[wordIndex]
                    processed.x = offsetX
                    processed.y = offsetY
                    processed.width = width
                    start = end + 1
                    wordIndex++
                }
            }
            console.log(new Date().getTime())
            console.log(words)
            //

            //draw worker
            this.drawWorker = new DrawWorker()

            console.log('Worker Start time: ', new Date().getTime() - startTime)
            const workerProps = {
                startTime,
                workerTime: new Date().getTime(),
                words: textData.words,
                width,
                height,
                fontStyle,
                fontWeight,
                fontSize,
                fontFamily,
                align,
                lineIndent,
                padding,
                rowHeight: this.rowHeight,
                backgroundColor: this.backgroundColor,
                maxBlockHeight: this.maxBlockHeight,
                cpuCores,
                type: 'Draw',
                offscreen,
                fps,
            }
            this.drawWorker.postMessage(workerProps, [offscreen])

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
                        this.fullHeight = event.data.fullHeight
                        this.blockHeight = event.data.blockHeight
                        this.texturesNumber = event.data.texturesNumber
                        console.log('Worker end time: ', new Date().getTime() - startTime)

                        if (this.texturesNumber * width > this.maxBlockHeight) {
                            throw new Error('Texture is too big!!! Reduce Text length!!!')
                        }

                        // this.dummy.style.height = this.fullHeight + 'px'

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
                        // console.log('Worker update end time: ', new Date().getTime() - startTime)
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
        selectText(startPosition, movePosition) {
            const workerProps = {
                startPosition,
                movePosition,
                type: 'Select-Text'
            }
            // console.log(workerProps)
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