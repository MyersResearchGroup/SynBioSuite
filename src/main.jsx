import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { MantineProvider } from '@mantine/core'
import store from './redux/store'
import { Provider } from 'react-redux'

import TimeAgo from "javascript-time-ago"
import en from "javascript-time-ago/locale/en.json"

const theme = {
    colorScheme: 'dark',
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
