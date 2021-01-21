import React, { Component, createRef } from 'react'
import * as R from 'Ramda'
import GetScroller from './Scroller'
import Loader from '../assets/spinning-circles.svg'
import Resizer from '../assets/resize.svg'
import getLogger from '../utils/logger'
import { getTheme } from '../utils/textUtils'


let uidCounter = 0
const getDefaults = (_this, props) => {
    const defaultState = {
        width: 400,
        height: 400,
        minWidth: 200,
        minHeight: 200,
        maxWidth: 1920,
        maxHeight: 1080,
        fontSize: 20,
        fontFamily: 'Roboto',
        fontStyle: 'normal',
        fontWeight: 'normal',
        lineIndent: 4,
        letterSpacing: 0,
        padding: [0, 0, 0, 0],
        textDevider: `
            color: #3088c0;
            font-size: 14px;
        `,
        fps: true,
        progress: 0,
        stage: null,
        progressEnabled: true,
        shortcutsEnabled: true,
        align: 'left',
        trackSelected: false,
        suid: Symbol('suid'),
        textData: null,
        canvasReady: false,
        theme: getTheme(),
        showLog: true,
        getLogger: getLogger,
        cpuCores: window.navigator.hardwareConcurrency,
        onInitialized: () => { },
        onCanvasReady: () => _this.setState({ canvasReady: true }),
        onReady: () => { },
        onResize: () => { },
        onScrollerUpdated: () => { },
        onScrollerWillUnmount: () => { },
        onScrollTriggered: () => { },
        onProgressChange: ({ progress, stage }) => _this.setState({ progress, stage }),
        onPlayWord: () => { }
    }
    const refs = {
        containerRef: createRef(),
        scrollRef: createRef(),
        canvasRef: createRef(),
        dummyRef: createRef(),
        resizerRef: createRef(),
        resizeBlinderRef: createRef(),
        fpsRef: createRef(),
    }
    const uid = `canvas-${new Date().getTime() + uidCounter}`
    uidCounter++
    const _props = R.mergeAll([defaultState, refs, props])
    const Logger = getLogger({
        theme: _props.theme,
        showLog: _props.showLog
    })
    return R.merge(_props, { uid, Logger })
}
const DefaultLoader = ({ isLoading, canvasReady, progressEnabled, progress, stage }) => {
    const loaderClass = 'loader-container' + (canvasReady ? ' ready' : '')
    return (
        (isLoading) &&
        <div className={loaderClass}>
            <div className='blinder' />
            <img src={Loader} />
            {progressEnabled &&
                <section className='default-progress'>
                    <span className='progress-stage'>{stage}</span>
                    <progress className='bar' value={progress} max='100'></progress>
                </section>}
        </div>
    )
}
const DefaultFPSCounter = ({ fps, fpsRef }) => {
    {/* <meter low="60" high="80" max="100" value="70">Very High</meter> */ }
    return (
        fps && <output className='fps-counter' ref={fpsRef}>...</output>
    )
}

class ScrolledCanvas extends Component {
    constructor(props) {
        super(props)
        this.state = getDefaults(this, props)
    }

    componentDidMount() {
        try {
            const scroller = GetScroller().init(this.state)
            this.setState({
                scrollerInstance: scroller
            })
        } catch (e) {
            console.error(e.message, e.name)
        }
        document.documentElement.addEventListener('mousemove', this.resizeHandler, false);
        document.documentElement.addEventListener('mouseup', this.endResizeHandler, false);
    }

    componentWillUnmount() {
        this.props.onScrollerWillUnmount()
        this.state.scrollerInstance.onDismount()
        document.documentElement.removeEventListener('mousemove', this.resizeHandler, false);
        document.documentElement.removeEventListener('mouseup', this.endResizeHandler, false);
    }

    shouldComponentUpdate(nextProps) {
        const { isLoading } = nextProps
        if (this.state.isLoading !== isLoading) {
            this.setState({
                isLoading: isLoading
            })
        }
        return true
    }

    lockClick = false
    selectionStarted = false
    startPosition = {
        x: 0,
        y: 0
    }
    movePosition = {
        x: 0,
        y: 0
    }

    clickHandler = (e) => {
        if (this.lockClick) return
        const {
            scrollRef
        } = this.state
        const { top, left } = scrollRef.current.getBoundingClientRect()
        const x = e.pageX - left
        const y = e.pageY - top
        this.state.scrollerInstance.selectWord({ x, y })
    }

    mouseDownHandler = (e) => {
        if (e.button === 0) this.selectionStarted = true
        // const {
        //     scrollRef
        // } = this.state
        // const { top, left } = scrollRef.current.getBoundingClientRect()
        // const x = e.pageX - left
        // const y = e.pageY - top
        // this.startPosition = { x, y }
    }

    mouseUpHandler = (e) => {
        if (e.button !== 0) return
        setTimeout(() => {
            this.lockClick = false
            this.selectionStarted = false
        }, 1)
    }

    mouseMoveHandler = (e) => {
        if (this.selectionStarted) {
            this.lockClick = true
        } else {
            return
        }
        // const {
        //     scrollRef
        // } = this.state
        // const { top, left } = scrollRef.current.getBoundingClientRect()
        // const x = e.pageX - left
        // const y = e.pageY - top
        // this.movePosition = { x, y }
        // console.log(this.startPosition, this.movePosition)
    }

    resizeStarted = false
    resizeStartPosition = {
        x: 0,
        y: 0
    }
    containerStartSize = {
        width: 0,
        height: 0
    }
    containerResizeStored = {
        width: 0,
        height: 0
    }

    startResizeHandler = (e) => {
        if (e.button !== 0) return
        this.resizeStarted = true
        const {
            scrollRef,
            resizeBlinderRef
        } = this.state
        const scroll = scrollRef.current
        const blinder = resizeBlinderRef.current
        this.containerStartSize = {
            width: scroll.offsetWidth,
            height: scroll.offsetHeight
        }
        const {
            pageX,
            pageY,
        } = e
        this.resizeStartPosition = { x: pageX, y: pageY }
        // console.log(this.resizeStartPosition)
        scroll.className = 'scroll-container resize'
        blinder.className = 'resize-blinder resize'
        blinder.innerText = `${scroll.offsetWidth} x ${scroll.offsetHeight}`
    }

    endResizeHandler = (e) => {
        if (e.button !== 0) return
        this.resizeStarted = false
        const {
            width,
            height
        } = this.containerResizeStored
        const {
            scrollRef,
            resizeBlinderRef,
            scrollerInstance
        } = this.state
        const scroll = scrollRef.current
        const blinder = resizeBlinderRef.current
        scroll.className = 'scroll-container'
        blinder.className = 'resize-blinder'
        blinder.innerText = ''
        if (width || height) {
            scrollerInstance.resize(this.props.textData)
            this.containerResizeStored = { width: 0, height: 0 }
        }
    }

    resizeHandler = (e) => {
        if (!this.resizeStarted) return
        // if (e.buttons === 0) {
        //     this.resizeStarted = false
        //     return
        // }
        // console.log(e)
        const {
            scrollRef,
            resizeBlinderRef,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
        } = this.state
        const {
            pageX,
            pageY,
        } = e
        const scroll = scrollRef.current
        const blinder = resizeBlinderRef.current
        const x = pageX - this.resizeStartPosition.x
        const y = pageY - this.resizeStartPosition.y
        const newWidth = this.containerStartSize.width + (x * 2)
        const newHeight = this.containerStartSize.height + y
        let width = newWidth >= minWidth ? (newWidth <= maxWidth ? newWidth : maxWidth) : minWidth
        let height = newHeight >= minHeight ? (newHeight <= maxHeight ? newHeight : maxHeight) : minHeight
        scroll.style.width = width + 'px'
        scroll.style.height = height + 'px'
        blinder.innerText = `${width} x ${height}`
        this.containerResizeStored = { width, height }
    }


    render() {
        const {
            width,
            height,
            fps,
            containerRef,
            scrollRef,
            canvasRef,
            dummyRef,
            resizerRef,
            resizeBlinderRef,
            fpsRef,
            uid,
            isLoading,
            canvasReady,
            progressEnabled,
            progress,
            stage,
        } = this.state
        return (
            <>
                <section className='scrollable-canvas' ref={containerRef}>
                    <div
                        className='scroll-container'
                        ref={scrollRef}
                        onMouseDown={this.mouseDownHandler}
                        onMouseUp={this.mouseUpHandler}
                        onMouseMove={this.mouseMoveHandler}
                        onClick={this.clickHandler}
                    >
                        <div
                            className='dummy'
                            ref={dummyRef}
                            width={width}
                            height={height}
                        ></div>
                    </div>
                    <canvas id={`canvas-${uid}`} ref={canvasRef} width={width} height={height} className='webgl-canvas'></canvas>
                    <div
                        ref={resizerRef}
                        className='resizer'
                        onMouseDown={this.startResizeHandler}
                    >
                        <img src={Resizer} />
                    </div>
                    <div
                        className='resize-blinder'
                        ref={resizeBlinderRef}
                    ></div>
                    <DefaultLoader
                        progressEnabled={progressEnabled}
                        progress={progress}
                        stage={stage}
                        canvasReady={canvasReady}
                        isLoading={isLoading} />
                    <DefaultFPSCounter fps={fps} fpsRef={fpsRef} />
                </section>
            </>
        )
    }
}

export default ScrolledCanvas