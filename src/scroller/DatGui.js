import React, { Component, createRef } from 'react';
import * as dat from 'dat.gui'

class UserInterface extends Component {
    constructor(props) {
        super(props)
        this.state = {
            guiContainer: createRef()
        }
    }

    onGuiChange = (controller, value, performance) => {
        const { property } = controller
        console.log(controller, property, value)
        if (property === 'run') {
            performance.isRunning = !performance.isRunning
            const { isRunning } = performance
            if (isRunning) {
                controller.name('stop test')
            } else {
                controller.name('run test')
            }
        } else {
            performance[property] = value
        }
        this.props.onGuiChange({ ...performance })
    }

    componentDidMount() {
        const _this = this
        const onGuiChange = function (value) {
            _this.onGuiChange(this, value, performance)
        }

        const {
            guiContainer
        } = this.state

        const performance = {
            // message: 'dat.gui',
            elements: 1000,
            frequency: 100,
            isRunning: false,
            // displayOutline: false,
            run: () => { },
            // color: '#FF0000'
        }

        const gui = new dat.GUI({ autoPlace: false })
        const menu = gui.addFolder('Performance Test')
        menu.add(performance, 'elements', 100, 10000).step(1).onFinishChange(onGuiChange)
        menu.add(performance, 'frequency', 1, 1000).step(1).onFinishChange(onGuiChange)
        menu.add(performance, 'run').onFinishChange(onGuiChange).name('run test')
        // menu.add(performance, 'Stop test').onChange(onGuiChange)


        // menu.addColor(text, 'color').onChange(onGuiChange)
        // menu.add(text, 'displayOutline').onChange(onGuiChange)
        // menu.add(text, 'message').onChange(onGuiChange)

        const customContainer = guiContainer.current
        customContainer.appendChild(gui.domElement)
    }

    render() {
        const {
            guiContainer
        } = this.state

        return (
            <section className='gui-container' ref={guiContainer} ></section>
        )
    }
}

export default UserInterface