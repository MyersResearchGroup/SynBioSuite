import {
    clearCredentials,
    getCredentialsForRepository,
    getRepository,
    setCredentials,
} from './credentialStore.js';
import { AUTH_ERROR_CODES } from './providers/errors.js';
import { getAuthProvider } from './providers/index.js';

export const AUTH_STATES = Object.freeze({
    UNKNOWN: 'unknown',
    AUTHENTICATED: 'authenticated',
    EXPIRED: 'expired',
    LOGGED_OUT: 'logged_out',
});

export class AuthCancelledError extends Error {
    constructor() {
        super('Authentication was cancelled.');
        this.name = 'AuthCancelledError';
        this.code = 'AUTH_CANCELLED';
    }
}

const defaultStore = {
    getCredentials: getCredentialsForRepository,
    getRepository,
    setCredentials,
    clearCredentials,
};

function repositoryKey(provider, registryURL) {
    return `${String(provider).toLowerCase()}:${registryURL}`;
}

export function createAuthCoordinator({
    credentialStore = defaultStore,
    providerResolver = getAuthProvider,
    requestLogin = null,
} = {}) {
    const states = new Map();
    const pendingLogins = new Map();
    let loginRequester = requestLogin;

    const setState = (provider, registryURL, state) => {
        states.set(repositoryKey(provider, registryURL), state);
    };

    const contextFor = (provider, registryURL, credentials) => {
        const repository = credentialStore.getRepository(provider, registryURL);
        const instance = repository?.registryAPI || registryURL;
        const adapter = providerResolver(provider);
        return {
            provider: adapter.provider,
            registryURL,
            repository,
            instance,
            credentials,
            adapter,
            authorizationHeaders: adapter.authorizationHeaders(credentials || {}),
        };
    };

    const openLogin = async (provider, registryURL) => {
        const key = repositoryKey(provider, registryURL);
        if (pendingLogins.has(key)) return pendingLogins.get(key);
        if (typeof loginRequester !== 'function') {
            throw new Error('No shared authentication UI requester is configured.');
        }

        const pending = (async () => {
            const result = await loginRequester(contextFor(provider, registryURL, null));
            if (result?.cancelled || result?.completed === false) {
                setState(provider, registryURL, AUTH_STATES.LOGGED_OUT);
                throw new AuthCancelledError();
            }

            const credentials = result?.credentials
                || credentialStore.getCredentials(provider, registryURL);
            if (!credentials?.accessToken) {
                setState(provider, registryURL, AUTH_STATES.LOGGED_OUT);
                throw new AuthCancelledError();
            }
            credentialStore.setCredentials(provider, registryURL, credentials);
            setState(provider, registryURL, AUTH_STATES.AUTHENTICATED);
            return contextFor(provider, registryURL, credentials);
        })().finally(() => pendingLogins.delete(key));

        pendingLogins.set(key, pending);
        return pending;
    };

    const requireCredential = async ({ provider, registryURL, forceLogin = false }) => {
        if (!provider || !registryURL) {
            throw new TypeError('provider and registryURL are required.');
        }
        if (forceLogin) return openLogin(provider, registryURL);

        const credentials = credentialStore.getCredentials(provider, registryURL);
        if (!credentials?.accessToken) return openLogin(provider, registryURL);

        const context = contextFor(provider, registryURL, credentials);
        try {
            await context.adapter.validate({
                instance: context.instance,
                ...credentials,
            });
            setState(provider, registryURL, AUTH_STATES.AUTHENTICATED);
            return context;
        } catch (error) {
            if (error.code !== AUTH_ERROR_CODES.TOKEN_EXPIRED) throw error;
            setState(provider, registryURL, AUTH_STATES.EXPIRED);
        }

        if (context.adapter.supportsRefresh && credentials.refreshToken) {
            try {
                const refreshed = await context.adapter.refresh({
                    instance: context.instance,
                    ...credentials,
                });
                credentialStore.setCredentials(provider, registryURL, refreshed.credentials);
                setState(provider, registryURL, AUTH_STATES.AUTHENTICATED);
                return contextFor(provider, registryURL, refreshed.credentials);
            } catch (error) {
                if (error.code !== AUTH_ERROR_CODES.REFRESH_FAILED) throw error;
            }
        }

        credentialStore.clearCredentials(provider, registryURL);
        return openLogin(provider, registryURL);
    };

    return Object.freeze({
        requireCredential,
        requireClient: requireCredential,

        async runWithCredential(params, operation) {
            let context = await requireCredential(params);
            try {
                return await operation(context);
            } catch (error) {
                if (error.code !== AUTH_ERROR_CODES.TOKEN_EXPIRED) throw error;
                credentialStore.clearCredentials(params.provider, params.registryURL);
                setState(params.provider, params.registryURL, AUTH_STATES.EXPIRED);
                context = await requireCredential({ ...params, forceLogin: true });
                return operation(context);
            }
        },

        logout(provider, registryURL) {
            credentialStore.clearCredentials(provider, registryURL);
            setState(provider, registryURL, AUTH_STATES.LOGGED_OUT);
        },

        getState(provider, registryURL) {
            return states.get(repositoryKey(provider, registryURL)) || AUTH_STATES.UNKNOWN;
        },

        setLoginRequester(requester) {
            loginRequester = requester;
            return () => {
                if (loginRequester === requester) loginRequester = null;
            };
        },
    });
}

export const authCoordinator = createAuthCoordinator();
