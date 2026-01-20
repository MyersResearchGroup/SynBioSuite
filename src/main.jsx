import store from './redux/store'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { Provider } from 'react-redux'
import { MantineProvider } from '@mantine/core'

import TimeAgo from "javascript-time-ago"
import en from "javascript-time-ago/locale/en.json"
import { ModalsProvider } from '@mantine/modals'
import { NotificationsProvider } from '@mantine/notifications'
import { msalInstance } from './microsoft-utils/auth/msalInit'

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

// Startup msal for logging in with Microsoft
await msalInstance.initialize();

try {
    const redirectResult = await msalInstance.handleRedirectPromise();
    if (redirectResult) {
        msalInstance.setActiveAccount(redirectResult.account);
    }
} catch (error) {
    if (error.errorCode !== 'no_token_request_cache_error') {
        console.error('MSAL redirect error:', error);
    }
} 

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <MantineProvider theme={theme} withGlobalStyles withNormalizeCSS>
                <NotificationsProvider autoClose={5000} limit={8}>
                    <ModalsProvider>
                        <App />
                    </ModalsProvider>
                </NotificationsProvider>
            </MantineProvider>
        </Provider>
    </React.StrictMode>
)
