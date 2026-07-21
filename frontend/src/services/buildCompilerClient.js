import axios from 'axios';
import { AUTH_ERROR_CODES } from '../modules/auth/providers/errors.js';

export const BUILD_COMPILER_TOKEN_HEADER = 'X-SynBioHub-Token';

function normalizeBaseURL(value) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error('VITE_SYNBIOSUITE_API is not configured.');
    }
    return value.trim().replace(/\/+$/, '');
}

export function createBuildCompilerClient(
    http = axios,
    baseURL = import.meta.env?.VITE_SYNBIOSUITE_API,
) {
    const endpoint = (path) => `${normalizeBaseURL(baseURL)}/api/buildcompiler${path}`;
    const authConfig = (accessToken, config = {}) => ({
        ...config,
        headers: {
            ...(config.headers || {}),
            ...(accessToken ? { [BUILD_COMPILER_TOKEN_HEADER]: accessToken } : {}),
        },
    });
    const post = async (path, payload, accessToken, signal) => {
        try {
            return (await http.post(
                endpoint(path),
                payload,
                authConfig(accessToken, { signal }),
            )).data;
        } catch (error) {
            if (error.response?.status === 401) {
                error.code = AUTH_ERROR_CODES.TOKEN_EXPIRED;
            }
            throw error;
        }
    };

    return Object.freeze({
        async capabilities() {
            return (await http.get(endpoint('/capabilities'))).data;
        },

        async plan(payload, { accessToken, signal } = {}) {
            return post('/plan', payload, accessToken, signal);
        },

        async compile(payload, { accessToken, signal } = {}) {
            return post('/compile', payload, accessToken, signal);
        },
    });
}

export const buildCompilerClient = createBuildCompilerClient();
