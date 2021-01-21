import React from 'react'

const rand = (n) => {
    return Math.floor(Math.random() * n)
}

const getColor = () => {
    return `rgba(${rand(255)}, ${rand(255)}, ${rand(255)}, ${rand(100) / 200 + 0.5})`
}

export default (() => {
    let interval
    let elements
    let duration
    let spans
    const test = (elms = 1200, fq = 100) => {
        duration = 1000 / fq
        if (elms !== elements) {
            elements = elms
            spans = new Array(elements).fill(0).map((a, i) => {
                return {
                    id: `span-${i}`,
                    color: getColor(),
                    backgroundColor: getColor()
                }
            })
        }
        interval && test.clearInterval()
        test.startInterval()
        return spans
    }
    test.startInterval = () => {
        interval = setInterval(() => {
            const r = Math.floor(Math.random() * elements)
            const el = document.getElementById(`span-${r}`)
            if (el) {
                el.style.color = getColor()
                el.style.backgroundColor = getColor()
                el.style.fontStyle = 'italic'
                el.innerText += '.'
            }
            // console.log(duration, elements, interval)
        }, duration)
    }
    test.clearInterval = () => {
        clearInterval(interval)
    }
    test.update = (props) => {
        test.clearInterval()
        elements = props.elements
        duration = 1000 / props.frequency
        test.startInterval()
    }
    test.getColor = getColor
    return test
})()