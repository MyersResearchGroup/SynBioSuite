import assert from 'node:assert/strict';
import test from 'node:test';

import { createCredentialStore } from './credentialStore.js';

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key) => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
        snapshot: () => Object.fromEntries(values),
    };
}

test('empty storage migrates idempotently', () => {
    const localStorage = memoryStorage();
    const sessionStorage = memoryStorage();
    const store = createCredentialStore({ localStorage, sessionStorage });

    assert.deepEqual(store.migrateLegacyStorage(), {
        repositoriesMigrated: 0,
        credentialsMigrated: 0,
    });
    assert.deepEqual(store.migrateLegacyStorage(), {
        repositoriesMigrated: 0,
        credentialsMigrated: 0,
    });
    assert.deepEqual(store.listRepositories('synbiohub'), []);
    assert.deepEqual(store.listCredentials(), []);
});

test('valid legacy records retain metadata and move tokens to session storage', () => {
    const localStorage = memoryStorage({
        SynbioHub: JSON.stringify([{
            registryURL: 'https://sbh.example',
            registryAPI: 'https://api.sbh.example',
            username: 'scientist',
            authtoken: 'sbh-secret',
        }]),
        Flapjack: JSON.stringify([{
            registryURL: 'https://fj.example',
            email: 'scientist@example.org',
            authtoken: 'fj-secret',
            refresh: 'refresh-secret',
        }]),
    });
    const sessionStorage = memoryStorage();
    const store = createCredentialStore({ localStorage, sessionStorage });

    assert.deepEqual(store.migrateLegacyStorage(), {
        repositoriesMigrated: 2,
        credentialsMigrated: 2,
    });
    assert.deepEqual(store.getRepository('synbiohub', 'https://sbh.example'), {
        registryURL: 'https://sbh.example',
        registryAPI: 'https://api.sbh.example',
        username: 'scientist',
    });
    assert.deepEqual(store.getCredentialsForRepository('sbh', 'https://sbh.example/'), {
        accessToken: 'sbh-secret',
    });
    assert.deepEqual(store.getCredentialsForRepository('flapjack', 'https://fj.example'), {
        accessToken: 'fj-secret',
        refreshToken: 'refresh-secret',
    });
    assert.equal(JSON.stringify(localStorage.snapshot()).includes('secret'), false);

    assert.deepEqual(store.migrateLegacyStorage(), {
        repositoriesMigrated: 0,
        credentialsMigrated: 0,
    });
});

test('malformed records become a safe empty collection', () => {
    const localStorage = memoryStorage({
        SynbioHub: '{not-json',
        Flapjack: JSON.stringify({ registryURL: 'https://not-an-array.example' }),
    });
    const store = createCredentialStore({
        localStorage,
        sessionStorage: memoryStorage(),
    });

    store.migrateLegacyStorage();
    assert.deepEqual(JSON.parse(localStorage.getItem('SynbioHub')), []);
    assert.deepEqual(JSON.parse(localStorage.getItem('Flapjack')), []);
});

test('partially migrated records do not replace newer session credentials', () => {
    const localStorage = memoryStorage({
        Flapjack: JSON.stringify([{
            registryURL: 'https://fj.example',
            registryAPI: 'https://api.fj.example',
            authtoken: 'old-access',
            refresh: 'old-refresh',
        }]),
    });
    const sessionStorage = memoryStorage();
    const store = createCredentialStore({ localStorage, sessionStorage });
    store.setCredentials('flapjack', 'https://fj.example', {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
    });

    store.migrateLegacyStorage();

    assert.deepEqual(store.getCredentialsForRepository('fj', 'https://fj.example'), {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
    });
    assert.equal(localStorage.getItem('Flapjack').includes('old-access'), false);
});

test('repository operations keep credentials separate and clear both safely', () => {
    const localStorage = memoryStorage();
    const sessionStorage = memoryStorage();
    const store = createCredentialStore({ localStorage, sessionStorage });

    store.setRepository('synbiohub', {
        registryURL: 'https://sbh.example',
        name: 'Example registry',
        authToken: 'session-only',
    });

    assert.equal(store.listRepositories('synbiohub').length, 1);
    assert.equal(localStorage.getItem('SynbioHub').includes('session-only'), false);
    assert.deepEqual(store.getCredentialsForRepository('synbiohub', 'https://sbh.example'), {
        accessToken: 'session-only',
    });

    store.removeRepository('synbiohub', 'https://sbh.example');
    assert.deepEqual(store.listRepositories('synbiohub'), []);
    assert.deepEqual(store.getCredentialsForRepository('synbiohub', 'https://sbh.example'), {});
});

test('primary repository selection is provider-scoped and clears with its repository', () => {
    const localStorage = memoryStorage();
    const store = createCredentialStore({ localStorage, sessionStorage: memoryStorage() });

    store.setPrimaryRepository('sbh', 'https://sbh.example/');
    store.setPrimaryRepository('flapjack', 'https://fj.example');

    assert.equal(store.getPrimaryRepository('synbiohub'), 'https://sbh.example');
    assert.equal(store.getPrimaryRepository('fj'), 'https://fj.example');
    assert.equal(localStorage.getItem('synbiosuite.primary-repositories.v1').includes('token'), false);

    store.setRepository('synbiohub', { registryURL: 'https://sbh.example' });
    store.removeRepository('synbiohub', 'https://sbh.example');
    assert.equal(store.getPrimaryRepository('synbiohub'), '');
    assert.equal(store.getPrimaryRepository('flapjack'), 'https://fj.example');
});
