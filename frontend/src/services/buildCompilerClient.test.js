import assert from 'node:assert/strict';
import test from 'node:test';

import {
    BUILD_COMPILER_TOKEN_HEADER,
    createBuildCompilerClient,
} from './buildCompilerClient.js';
import { AUTH_ERROR_CODES } from '../modules/auth/providers/errors.js';

test('BuildCompiler client uses the configured backend and dedicated token header', async () => {
    const calls = [];
    const http = {
        get: async (...args) => { calls.push(['get', ...args]); return { data: { schema_version: '1.0' } }; },
        post: async (...args) => { calls.push(['post', ...args]); return { data: { status: 'success' } }; },
    };
    const client = createBuildCompilerClient(http, 'http://localhost:5003/');
    const controller = new AbortController();

    await client.capabilities();
    await client.plan(
        { design: { uri: 'https://example/design' } },
        { accessToken: 'request-token', signal: controller.signal },
    );
    await client.compile({ plan: { id: 'plan-1' } }, { accessToken: 'request-token' });

    assert.equal(calls[0][1], 'http://localhost:5003/api/buildcompiler/capabilities');
    assert.equal(calls[1][1], 'http://localhost:5003/api/buildcompiler/plan');
    assert.equal(calls[1][3].headers[BUILD_COMPILER_TOKEN_HEADER], 'request-token');
    assert.equal(calls[1][3].signal, controller.signal);
    assert.equal(calls[2][1], 'http://localhost:5003/api/buildcompiler/compile');
});

test('BuildCompiler client fails clearly when the backend URL is absent', async () => {
    const client = createBuildCompilerClient({ get: async () => ({ data: {} }) }, '');
    await assert.rejects(client.capabilities(), /VITE_SYNBIOSUITE_API/);
});

test('BuildCompiler client marks backend 401 responses for coordinator retry', async () => {
    const unauthorized = Object.assign(new Error('request failed'), {
        response: { status: 401, data: { error: { code: 'INVALID_CREDENTIALS' } } },
    });
    const client = createBuildCompilerClient({
        post: async () => { throw unauthorized; },
    }, 'http://localhost:5003');

    await assert.rejects(
        client.plan({}, { accessToken: 'expired' }),
        (error) => error.code === AUTH_ERROR_CODES.TOKEN_EXPIRED,
    );
});
