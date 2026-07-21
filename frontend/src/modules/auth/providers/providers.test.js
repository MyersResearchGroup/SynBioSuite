import assert from 'node:assert/strict';
import test from 'node:test';

import { AUTH_ERROR_CODES } from './errors.js';
import { createFlapjackAdapter } from './flapjack.js';
import { createSynBioHubAdapter } from './synbiohub.js';

function client(overrides = {}) {
    return {
        get: async () => ({ data: {} }),
        post: async () => ({ data: {} }),
        ...overrides,
    };
}

test('SynBioHub adapter logs in, validates, logs out, and centralizes headers', async () => {
    const calls = [];
    const adapter = createSynBioHubAdapter(client({
        post: async (...args) => {
            calls.push(['post', ...args]);
            return { data: args[0].endsWith('/login') ? 'secret-token' : 'ok' };
        },
        get: async (...args) => {
            calls.push(['get', ...args]);
            return { data: { email: 'user@example.org' } };
        },
    }));

    const login = await adapter.login({
        instance: 'https://sbh.example/',
        email: 'user@example.org',
        password: 'not-retained',
    });
    const validation = await adapter.validate({
        instance: 'https://sbh.example',
        accessToken: login.credentials.accessToken,
    });
    await adapter.logout({ instance: 'https://sbh.example', accessToken: 'secret-token' });

    assert.deepEqual(login.credentials, { accessToken: 'secret-token' });
    assert.equal(validation.profile.email, 'user@example.org');
    assert.deepEqual(adapter.authorizationHeaders({ accessToken: 'secret-token' }), {
        Accept: 'text/plain; charset=UTF-8',
        'X-authorization': 'secret-token',
    });
    assert.equal(calls[0][1], 'https://sbh.example/login');
});

test('Flapjack adapter refreshes tokens and centralizes bearer headers', async () => {
    const adapter = createFlapjackAdapter(client({
        post: async (url) => {
            if (url.endsWith('/log_in/')) {
                return { data: { access: 'access-1', refresh: 'refresh-1', username: 'sam' } };
            }
            if (url.endsWith('/refresh/')) {
                return { data: { access: 'access-2' } };
            }
            return { data: {} };
        },
    }));

    const login = await adapter.login({ instance: 'https://fj.example', username: 'sam', password: 'pw' });
    const refreshed = await adapter.refresh({ instance: 'https://fj.example', refreshToken: 'refresh-1' });
    await adapter.validate({ instance: 'https://fj.example', accessToken: 'access-2' });

    assert.deepEqual(login.credentials, { accessToken: 'access-1', refreshToken: 'refresh-1' });
    assert.deepEqual(refreshed.credentials, { accessToken: 'access-2', refreshToken: 'refresh-1' });
    assert.deepEqual(adapter.authorizationHeaders({ accessToken: 'access-2' }), {
        Accept: 'application/json',
        Authorization: 'Bearer access-2',
    });
});

test('provider errors are stable and never include response secrets', async () => {
    const adapter = createSynBioHubAdapter(client({
        post: async () => {
            const error = new Error('server echoed password=top-secret');
            error.response = { status: 401, data: { token: 'secret-token' } };
            throw error;
        },
    }));

    await assert.rejects(
        adapter.login({ instance: 'https://sbh.example', email: 'sam', password: 'top-secret' }),
        (error) => {
            assert.equal(error.code, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
            assert.doesNotMatch(error.message, /top-secret|secret-token/);
            return true;
        },
    );
});

test('expired and refresh-failed states use distinct normalized codes', async () => {
    const unauthorized = () => {
        const error = new Error('unauthorized');
        error.response = { status: 401 };
        throw error;
    };
    const sbh = createSynBioHubAdapter(client({ get: unauthorized }));
    const fj = createFlapjackAdapter(client({ post: unauthorized }));

    await assert.rejects(
        sbh.validate({ instance: 'https://sbh.example', accessToken: 'expired' }),
        (error) => error.code === AUTH_ERROR_CODES.TOKEN_EXPIRED,
    );
    await assert.rejects(
        fj.refresh({ instance: 'https://fj.example', refreshToken: 'expired' }),
        (error) => error.code === AUTH_ERROR_CODES.REFRESH_FAILED,
    );
});
