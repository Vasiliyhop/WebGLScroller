import React, { Component } from 'react'
import Test from '../utils/performanceUtil'

export default class Performance extends Component {
    constructor(props) {
        super(props)
        const {
            elements,
            frequency
        } = props
        this.state = {
            perfTest: Test(elements, frequency)
        }
    }

    componentDidUpdate() {
        const {
            perfTest
        } = this.state
        const {
            elements,
            frequency
        } = this.props
        if (elements !== perfTest.length) {
            const spans = Test(elements, frequency)
            this.setState({
                perfTest: spans
            })
        } else {
            Test.update(this.props)
        }
    }
    componentWillUnmount() {
        Test.clearInterval();
    }
    render() {
        const {
            perfTest
        } = this.state
        return (
            <div className='performance-test'>
                {
                    perfTest &&
                    perfTest.map(el => {
                        const {
                            id,
                            color,
                            backgroundColor
                        } = el
                        return (
                            <span
                                className='test-span'
                                key={id}
                                id={id}
                                style={{ color, backgroundColor }}
                                onClick={(e) => {
                                    const {
                                        style
                                    } = e.target
                                    style.color = Test.getColor()
                                    style.backgroundColor = Test.getColor()
                                }}
                            >Performance test ...</span>
                        )
                    })
                }
            </div>
        )
    }
}
