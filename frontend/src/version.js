import packageJson from '../package.json'

export const APP_VERSION = packageJson.version

export const VERSION_STORAGE_KEY = 'synbiosuite-version'

/** Keys that should survive a version upgrade and never be wiped. */
const PRESERVED_KEYS = ['first-time-visiting']

export function checkAndClearOnVersionMismatch() {
    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)

    if (storedVersion !== APP_VERSION) {
        // Snapshot values we want to keep across version upgrades
        const preserved = {}
        for (const key of PRESERVED_KEYS) {
            const val = localStorage.getItem(key)
            if (val !== null) preserved[key] = val
        }

        localStorage.clear()

        // Restore preserved values
        for (const [key, val] of Object.entries(preserved)) {
            localStorage.setItem(key, val)
        }

        localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION)
        return true
    }

    return false
}
