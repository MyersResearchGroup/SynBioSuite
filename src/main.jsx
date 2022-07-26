import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { MantineProvider } from '@mantine/core'
import store from './redux/store'
import { Provider } from 'react-redux'

const theme = {
    colorScheme: 'dark',
    other: {
        isDark: true,
        inactiveColor: '#909296', // theme.colors.dark[2]
        activeColor: '#dee2e6', // theme.colors.gray[3]
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <MantineProvider theme={theme} withGlobalStyles >
                <App />
            </MantineProvider>
        </Provider>
    </React.StrictMode>
)
