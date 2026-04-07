import packageJson from '../package.json'
import { getWebOfRegistries } from './API'

export const APP_VERSION = packageJson.version

export const VERSION_STORAGE_KEY = 'synbiosuite-version'

/** Keys that should survive a version upgrade and never be wiped. */
const PRESERVED_KEYS = ['first-time-visiting']

function getMajorMinor(version) {
    if (!version || typeof version !== 'string') return null
    const [major = '', minor = ''] = version.split('.')
    if (!/^\d+$/.test(major) || !/^\d+$/.test(minor)) return null
    return `${major}.${minor}`
}

export async function checkAndClearOnVersionMismatch() {
    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)
    const currentMajorMinor = getMajorMinor(APP_VERSION)
    const storedMajorMinor = getMajorMinor(storedVersion)

    // Run initialization on first launch or major/minor version mismatch (ignore patch changes).
    const shouldReset = !storedVersion ||
        !currentMajorMinor ||
        !storedMajorMinor ||
        storedMajorMinor !== currentMajorMinor

    if (shouldReset) {
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

        try {
            const existingRegistries = localStorage.getItem('SynbioHub');
            if (!existingRegistries || JSON.parse(existingRegistries).length === 0) {
                const registries = await getWebOfRegistries();
                localStorage.setItem('SynbioHub', JSON.stringify(registries));
            }
        } catch (error) {
            console.error('Failed to initialize Web of Registries:', error);
        }

        localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION)
        return true
    }

    return false
}
