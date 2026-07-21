import axios from 'axios';
import { normalizeAuthError } from './errors.js';
import { bearerHeaders, normalizeInstance } from './shared.js';

const PROVIDER = 'flapjack';

export function createFlapjackAdapter(client = axios) {
    const authorizationHeaders = ({ accessToken } = {}) => ({
        Accept: 'application/json',
        ...bearerHeaders(accessToken),
    });
    const getProfile = async ({ instance, accessToken }) => {
        try {
            const response = await client.get(`${normalizeInstance(instance)}/api/auth/user/`, {
                headers: authorizationHeaders({ accessToken }),
            });
            return response.data;
        } catch (error) {
            throw normalizeAuthError(error, { provider: PROVIDER, operation: 'profile' });
        }
    };

    return Object.freeze({
        provider: PROVIDER,
        supportsRefresh: true,
        authorizationHeaders,

        async login({ instance, username, password }) {
            try {
                const response = await client.post(`${normalizeInstance(instance)}/api/auth/log_in/`, {
                    username,
                    password,
                }, {
                    headers: { 'Content-Type': 'application/json' },
                });
                const { access, refresh, ...profile } = response.data || {};
                return {
                    credentials: { accessToken: access, refreshToken: refresh },
                    profile,
                };
            } catch (error) {
                throw normalizeAuthError(error, { provider: PROVIDER, operation: 'login' });
            }
        },

        async validate({ instance, accessToken }) {
            try {
                await client.post(`${normalizeInstance(instance)}/api/auth/verify/`, {
                    token: accessToken,
                }, {
                    headers: { 'Content-Type': 'application/json' },
                });
                return { valid: true };
            } catch (error) {
                throw normalizeAuthError(error, { provider: PROVIDER, operation: 'validate' });
            }
        },

        async refresh({ instance, refreshToken }) {
            try {
                const response = await client.post(`${normalizeInstance(instance)}/api/auth/refresh/`, {
                    refresh: refreshToken,
                }, {
                    headers: { 'Content-Type': 'application/json' },
                });
                return {
                    credentials: {
                        accessToken: response.data?.access,
                        refreshToken: response.data?.refresh || refreshToken,
                    },
                };
            } catch (error) {
                throw normalizeAuthError(error, { provider: PROVIDER, operation: 'refresh' });
            }
        },

        async logout() {
            return { loggedOut: true };
        },

        profile: getProfile,
        getProfile,
    });
}

export const flapjackAdapter = createFlapjackAdapter();
