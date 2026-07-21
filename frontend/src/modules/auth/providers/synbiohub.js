import axios from 'axios';
import { normalizeAuthError } from './errors.js';
import { normalizeInstance, synBioHubHeaders } from './shared.js';

const PROVIDER = 'synbiohub';

export function createSynBioHubAdapter(client = axios) {
    const authorizationHeaders = ({ accessToken } = {}) => ({
        Accept: 'text/plain; charset=UTF-8',
        ...synBioHubHeaders(accessToken),
    });

    const getProfile = async ({ instance, accessToken }) => {
        try {
            const response = await client.get(`${normalizeInstance(instance)}/profile`, {
                headers: authorizationHeaders({ accessToken }),
            });
            return response.data;
        } catch (error) {
            throw normalizeAuthError(error, { provider: PROVIDER, operation: 'profile' });
        }
    };

    return Object.freeze({
        provider: PROVIDER,
        supportsRefresh: false,
        authorizationHeaders,

        async login({ instance, email, password }) {
            try {
                const response = await client.post(`${normalizeInstance(instance)}/login`, {
                    email,
                    password,
                }, {
                    headers: {
                        Accept: 'text/plain',
                        'Content-Type': 'application/json',
                    },
                });
                const credentials = { accessToken: response.data };
                const profile = await getProfile({ instance, ...credentials });
                return { credentials, profile };
            } catch (error) {
                throw normalizeAuthError(error, { provider: PROVIDER, operation: 'login' });
            }
        },

        async validate({ instance, accessToken }) {
            const profile = await getProfile({ instance, accessToken });
            return { valid: true, profile };
        },

        async refresh({ instance, accessToken }) {
            const profile = await getProfile({ instance, accessToken });
            return { credentials: { accessToken }, profile };
        },

        async logout({ instance, accessToken }) {
            try {
                await client.post(`${normalizeInstance(instance)}/logout`, null, {
                    headers: authorizationHeaders({ accessToken }),
                });
                return { loggedOut: true };
            } catch (error) {
                throw normalizeAuthError(error, { provider: PROVIDER, operation: 'logout' });
            }
        },

        profile: getProfile,
        getProfile,
    });
}

export const synBioHubAdapter = createSynBioHubAdapter();
