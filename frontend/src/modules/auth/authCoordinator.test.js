import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AUTH_STATES,
    AuthCancelledError,
    createAuthCoordinator,
} from './authCoordinator.js';
import { AuthProviderError, AUTH_ERROR_CODES } from './providers/errors.js';

function fixture({ credentials = null, adapter, requestLogin } = {}) {
    let stored = credentials;
    const store = {
        getCredentials: () => stored,
        getRepository: () => ({ registryURL: 'https://repo.example', registryAPI: 'https://api.example' }),
        setCredentials: (_provider, _registryURL, value) => { stored = value; },
        clearCredentials: () => { stored = null; },
    };
    const coordinator = createAuthCoordinator({
        credentialStore: store,
        providerResolver: () => adapter,
        requestLogin,
    });
    return { coordinator, getStored: () => stored };
}

function adapter(overrides = {}) {
    return {
        provider: 'synbiohub',
        supportsRefresh: false,
        authorizationHeaders: ({ accessToken }) => ({ 'X-authorization': accessToken }),
        validate: async () => ({ valid: true }),
        ...overrides,
    };
}

test('an interrupted operation resumes once after shared login', async () => {
    let loginCount = 0;
    let operationCount = 0;
    const { coordinator } = fixture({
        adapter: adapter(),
        requestLogin: async () => {
            loginCount += 1;
            return { credentials: { accessToken: 'new-token' }, completed: true };
        },
    });

    const result = await coordinator.runWithCredential(
        { provider: 'synbiohub', registryURL: 'https://repo.example' },
        async ({ authorizationHeaders }) => {
            operationCount += 1;
            return authorizationHeaders['X-authorization'];
        },
    );

    assert.equal(result, 'new-token');
    assert.equal(loginCount, 1);
    assert.equal(operationCount, 1);
    assert.equal(coordinator.getState('synbiohub', 'https://repo.example'), AUTH_STATES.AUTHENTICATED);
});

test('cancellation rejects without running the operation', async () => {
    let operationCount = 0;
    const { coordinator } = fixture({
        adapter: adapter(),
        requestLogin: async () => ({ cancelled: true }),
    });

    await assert.rejects(
        coordinator.runWithCredential(
            { provider: 'synbiohub', registryURL: 'https://repo.example' },
            async () => { operationCount += 1; },
        ),
        AuthCancelledError,
    );
    assert.equal(operationCount, 0);
});

test('concurrent credential requests share one login', async () => {
    let resolveLogin;
    let loginCount = 0;
    const { coordinator } = fixture({
        adapter: adapter(),
        requestLogin: () => {
            loginCount += 1;
            return new Promise((resolve) => { resolveLogin = resolve; });
        },
    });
    const params = { provider: 'synbiohub', registryURL: 'https://repo.example' };
    const first = coordinator.requireCredential(params);
    const second = coordinator.requireCredential(params);

    resolveLogin({ credentials: { accessToken: 'shared-token' }, completed: true });
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assert.equal(loginCount, 1);
    assert.equal(firstResult.credentials.accessToken, 'shared-token');
    assert.equal(secondResult.credentials.accessToken, 'shared-token');
});

test('expired Flapjack access token refreshes without opening login', async () => {
    let loginCount = 0;
    const expired = new AuthProviderError(AUTH_ERROR_CODES.TOKEN_EXPIRED, 'expired');
    const { coordinator, getStored } = fixture({
        credentials: { accessToken: 'old', refreshToken: 'refresh' },
        adapter: adapter({
            provider: 'flapjack',
            supportsRefresh: true,
            validate: async () => { throw expired; },
            refresh: async () => ({ credentials: { accessToken: 'new', refreshToken: 'refresh-2' } }),
        }),
        requestLogin: async () => { loginCount += 1; },
    });

    const context = await coordinator.requireCredential({
        provider: 'flapjack',
        registryURL: 'https://repo.example',
    });

    assert.equal(context.credentials.accessToken, 'new');
    assert.equal(getStored().refreshToken, 'refresh-2');
    assert.equal(loginCount, 0);
});

test('an operation that expires retries exactly once after login', async () => {
    let operationCount = 0;
    const tokenExpired = new AuthProviderError(AUTH_ERROR_CODES.TOKEN_EXPIRED, 'expired');
    const { coordinator } = fixture({
        credentials: { accessToken: 'old' },
        adapter: adapter(),
        requestLogin: async () => ({ credentials: { accessToken: 'new' }, completed: true }),
    });

    const result = await coordinator.runWithCredential(
        { provider: 'synbiohub', registryURL: 'https://repo.example' },
        async ({ credentials }) => {
            operationCount += 1;
            if (operationCount === 1) throw tokenExpired;
            return credentials.accessToken;
        },
    );

    assert.equal(result, 'new');
    assert.equal(operationCount, 2);
});
