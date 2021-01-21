import React, { Component, createRef } from 'react'
import ScrollIcon from '../assets/scroll-down.svg'

export default class Speaker extends Component {
    constructor(props) {
        super(props)
        this.state = {
            synth: null,
            utterThis: null,
            playing: false,
            playingAnother: 0,
            textData: null,
            speakerRef: createRef(),
        }
        window.onbeforeunload = (e) => {
            this.state.synth && this.state.synth.cancel()
            return null
        }
    }
    componentDidMount() {
        this.props.onInterfaceReady({
            playAnother: this.playAnother,
            onDismount: this.onDismount,
            setBackground: this.setBackground,
        })
        // this.state.speakerRef.current.focus()

        document.addEventListener('keydown', this.onKeyDown, false)
    }
    componentWillUnmount() {
        document.removeEventListener('keydown', this.onKeyDown, false)
    }
    setBackground = (backgroundColor) => {
        const { speakerRef } = this.state
        const speaker = speakerRef.current
        speaker.style.backgroundColor = backgroundColor
    }
    onKeyDown = (e) => {
        e.which === 48 && this.onToggleIntroduction()
        e.which === 49 && this.onPlay()
        e.which === 50 && this.onRefresh()
        e.which === 51 && this.onTrack()
    }
    onTextInit(textData) {
        const {
            updateWord
        } = this.props
        var text = textData.words.map(w => w.word).join(' ')
        var synth = window.speechSynthesis
        var utterThis = new SpeechSynthesisUtterance(text)

        var voices = synth.getVoices().filter(v => v.lang === 'en-US')
        utterThis.volume = 0.5
        utterThis.lang = 'en-UK'
        utterThis.rate = 1
        let voiceURI = 'Alex'
        let voice = voices.find(v => v.voiceURI === voiceURI)
        utterThis.voice = voice
        this.setState({
            synth,
            utterThis
        })
        utterThis.onboundary = (event) => {
            const { playingAnother } = this.state
            var index = event.charIndex
            var played = utterThis.text.substring(0, index)
            var wordIndex = played.split(' ').length - 1 + playingAnother
            updateWord(wordIndex)
        }
    }
    onDismount = () => {
        this.state.synth && this.state.synth.cancel()
    }
    shouldComponentUpdate(nextProps) {
        const { textData } = nextProps
        if (this.state.textData !== textData) {
            this.setState({
                textData: textData
            })
            this.onTextInit(textData)
        }
        return true
    }
    onToggleIntroduction = () => {
        const {
            toggleIntro
        } = this.props
        toggleIntro()
    }
    onPlay = () => {
        const {
            textData,
            playing,
            synth,
            utterThis,
        } = this.state
        const {
            isLoading
        } = this.props
        if (!textData || isLoading) return
        if (synth.speaking) {
            if (playing) {
                synth.pause()
                this.setState({
                    playing: false
                })
            } else {
                synth.resume()
                this.setState({
                    playing: true
                })
            }
            return
        }

        synth.speak(utterThis)
        this.setState({
            playing: true
        })
    }

    //Refactor, too much issues
    playAnother = (index) => {
        let {
            textData,
            playing,
            synth,
            utterThis,
        } = this.state
        if (!synth) return
        let words = textData.words.slice(index)
        var text = words.map(w => w.word).join(' ')
        // utterThis = new SpeechSynthesisUtterance(text)
        utterThis.text = text
        this.setState({
            utterThis,
            playingAnother: index,
        })
        synth.cancel()
        if (!playing) return
        synth.speak(utterThis)
    }

    onRefresh = () => {
        let {
            synth,
            utterThis,
            textData,
            playing,
        } = this.state
        const {
            updateWord
        } = this.props
        if (synth) {
            synth.cancel()
            var text = textData.words.map(w => w.word).join(' ')
            utterThis.text = text
            this.setState({
                playingAnother: 0,
                utterThis,
            })
            updateWord(0)
            if (!playing) return
            synth.speak(utterThis)
        }
    }

    onTrack = () => {
        this.props.onTrack()
    }

    render() {
        const {
            playing,
            speakerRef,
        } = this.state

        return (
            <div
                className='speaker'
                tabIndex='0'
                ref={speakerRef}
            // onKeyDown={(e) => {
            //     e.which === 49 && this.onPlay()
            //     e.which === 50 && this.onRefresh()
            //     e.which === 51 && this.onTrack()
            // }}
            // onBlur={() => {
            //     // this.state.speakerRef.current.focus()
            // }}
            >
                <div className='buttons'>
                    {
                        playing ?
                            <button
                                className='button pause'
                                title='Pause'
                                onClick={this.onPlay}
                                key={playing}
                            ><i className='fas fa-pause'></i></button>
                            :
                            <button
                                className='button play'
                                title='Play'
                                onClick={this.onPlay}
                                key={playing}
                            ><i className='fas fa-play'></i></button>
                    }
                    <button
                        className='button fast-backward'
                        title='Fast-Backward'
                        onClick={this.onRefresh}
                    ><i className='fas fa-fast-backward'></i></button>
                    <button
                        className='button'
                        title='Keep Track'
                        onClick={this.onTrack}
                    ><img className='scroll-down' src={ScrollIcon} /></button>
                </div>
            </div>
        )
    }
}
