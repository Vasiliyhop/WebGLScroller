import '@fortawesome/fontawesome-free/js/fontawesome'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/regular'
import '@fortawesome/fontawesome-free/js/brands'
import './styles/index.scss'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

ReactDOM.render(
    <App />
    ,
    document.getElementById('root')
)
// console.group('Hot Reload')
module.hot.accept()
// console.groupEnd('Hot Reload')