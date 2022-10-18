import store from './redux/store'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { Provider } from 'react-redux'
import { MantineProvider } from '@mantine/core'

import TimeAgo from "javascript-time-ago"
import en from "javascript-time-ago/locale/en.json"

// const canvasBlue = ["#d6daee", "#c2c8e5", "#adb5dc", "#99a3d4", "#8490cb", "#707ec2", "#5b6bb9", "#4759b1", "#3246a8", "#2d3f97"]
const theme = {
    colorScheme: 'dark',
    // colors: {
    //     canvasBlue,
    //     primary: canvasBlue,
    // },
    primaryColor: "indigo",
    other: {
        isDark: true,
        inactiveColor: '#909296', // theme.colors.dark[2]
        activeColor: '#dee2e6', // theme.colors.gray[3]
    }
}

TimeAgo.addDefaultLocale(en)

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <MantineProvider theme={theme} withGlobalStyles withNormalizeCSS>
                <App />
            </MantineProvider>
        </Provider>
    </React.StrictMode>
)
