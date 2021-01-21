import React, { Component } from 'react'
import ScrolledCanvas from './scroller/ScrolledCanvas'
import { fetchText } from './utils/textUtils'
import BookText from './assets/tom.txt'
import Speaker from './scroller/Speaker'
import Performance from './scroller/Performance'
import DatGui from './scroller/DatGui'

const Shortcuts = ({ shortcutsEnabled }) => {
    return (
        shortcutsEnabled &&
        <details className='shortcuts-details'>
            <summary className='shortcuts-summary'>Shortcuts list</summary>
            <li className='shortcuts-info'><mark>0 key</mark>-<span>Toggle introduction</span></li>
            <li className='shortcuts-info'><mark>1 key</mark>-<span>Play/Pause</span></li>
            <li className='shortcuts-info'><mark>2 key</mark>-<span>Refresh</span></li>
            <li className='shortcuts-info'><mark>3 key</mark>-<span>Scroll to selected</span></li>
        </details>
    )
}
class App extends Component {
    constructor(props) {
        super(props)
        this.state = {
            isLoading: true,
            textData: null,
            selectInterval: null,
            scroller: null,
            showIntro: true,
            performance: {
                elements: 1000,
                frequency: 10,
                isRunning: false,
            }
        }
    }

    componentDidMount() {

    }

    componentDidUpdate() {
        const {
            scroller,
            speaker,
            textData
        } = this.state
        scroller && textData && scroller.stage === 'init' && scroller.prepareData(textData)
        scroller && speaker && speaker.setBackground(scroller.backgroundColor)
    }

    GetFooter(shortcutsEnabled) {
        const { } = this.state
        return (
            shortcutsEnabled &&
            <footer className='footer'>
                {shortcutsEnabled &&
                    <Shortcuts shortcutsEnabled={shortcutsEnabled} />
                }
                <small>© V.Shevchuk 2020</small>
            </footer>
        )
    }

    onTrack = () => {
        this.state.scroller.setTrackSelected(true)
    }

    updateWord = (selectedWordIndex) => {
        this.state.scroller.updateWord(selectedWordIndex)
    }

    toggleIntro = () => {
        this.setState({
            showIntro: !this.state.showIntro
        })
    }

    onGuiChange = (performance) => {
        this.setState({
            performance
        })
    }

    render() {
        const {
            isLoading,
            textData,
            showIntro,
            performance,
        } = this.state
        const {
            elements,
            frequency,
            isRunning
        } = performance

        return (
            <div className='app-container'>
                <main className='canvas-app-demo'>
                    {isRunning && <Performance elements={elements} frequency={frequency} />}
                    <section className='canvas-wrapper'>
                        <ScrolledCanvas
                            key={1}
                            fps={true}
                            width={700}
                            height={600}
                            minWidth={300}
                            minHeight={300}
                            maxWidth={1200}
                            maxHeight={800}
                            fontSize={20}
                            fontFamily='Roboto'
                            fontStyle='normal'
                            fontWeight='normal'
                            lineIndent={4}
                            padding={[15, 45, 30, 45]}
                            align='left'
                            trackSelected={true}
                            textData={textData}
                            isLoading={isLoading}
                            letterSpacing={0}
                            showLog={false}
                            onInitialized={(scroller) => {
                                const {
                                    Logger,
                                    theme
                                } = scroller
                                const result = fetchText(BookText, theme, Logger)
                                Logger(null, { divider: true })
                                Logger('Fetch text time: ', { fromStart: true, secondColor: true })
                                this.setState({
                                    textData: result,
                                    scroller: scroller,
                                })
                            }}
                            onReady={() => {
                                const { Logger } = this.state.scroller
                                Logger(`Ready time: `, { size: 'md', fromStart: true, secondColor: true })
                                Logger.groupEnd('Scrollable canvas group')
                                this.setState({
                                    isLoading: false
                                })
                            }}
                            onResize={() => {
                                this.setState({
                                    isLoading: true
                                })
                            }}
                            onScrollerWillUnmount={() => {
                                this.state.speaker.onDismount()
                            }}
                            onScrollTriggered={() => {
                                this.state.scroller.setTrackSelected(false)
                            }}
                            onPlayWord={(index) => {
                                this.state.speaker.playAnother(index)
                            }}
                        />
                        <Speaker
                            isLoading={isLoading}
                            onTrack={this.onTrack}
                            textData={textData}
                            updateWord={this.updateWord}
                            toggleIntro={this.toggleIntro}
                            onInterfaceReady={(publicInterface) => {
                                this.setState({
                                    speaker: publicInterface
                                })
                            }}
                        />
                        {showIntro &&
                            <section className='intro'>
                                <header className='header'>
                                    <h5>Scrollable Canvas</h5>
                                </header>
                                <article className='article'>

                                </article>
                                {this.GetFooter(true)}
                            </section>
                        }
                    </section>
                </main>
                <DatGui onGuiChange={this.onGuiChange} />
            </div>
        )
    }
}

export default App

/*
    TODO
    refactoring
    use classnames
    add volume
    text size [chapters] selector
    add dat.gui
*/
