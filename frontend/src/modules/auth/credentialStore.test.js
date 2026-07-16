import test from 'node:test';
import assert from 'node:assert/strict';
import {
    clearCredentials,
    getCredentialsForRepository,
    listRepositories,
    migrateLegacyStorage,
    setCredentials,
} from './credentialStore.js';

class MemoryStorage {
    constructor(values = {}) {
        this.values = new Map(Object.entries(values));
    }

    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
}

const storage = (legacy = {}) => ({
    localStorage: new MemoryStorage(legacy),
    sessionStorage: new MemoryStorage(),
});

test('migrates valid SynBioHub and Flapjack records without persisting tokens', () => {
    const stores = storage({
        SynbioHub: JSON.stringify([{ registryURL: 'https://sbh.example', registryAPI: 'https://api.sbh.example', authtoken: 'sbh-token', username: 'sam' }]),
        Flapjack: JSON.stringify([{ registryURL: 'https://fj.example', authtoken: 'fj-token', refresh: 'refresh-token', email: 'sam@example.org' }]),
    });

    migrateLegacyStorage(stores);

    assert.deepEqual(listRepositories('synbiohub', stores), [{
        provider: 'synbiohub', registryURL: 'https://sbh.example', registryAPI: 'https://api.sbh.example', registryPrefix: 'https://sbh.example', username: 'sam',
    }]);
    assert.equal(getCredentialsForRepository('synbiohub', 'https://sbh.example', stores).accessToken, 'sbh-token');
    assert.deepEqual(getCredentialsForRepository('flapjack', 'https://fj.example', stores), { accessToken: 'fj-token', refreshToken: 'refresh-token' });
    assert.doesNotMatch(stores.localStorage.getItem('synbiosuite.repositories.v1'), /sbh-token|fj-token|refresh-token/);
    assert.doesNotMatch(stores.localStorage.getItem('SynbioHub'), /sbh-token/);
    assert.match(stores.sessionStorage.getItem('synbiosuite.credentials.v1'), /sbh-token|fj-token|refresh-token/);
});

test('handles empty and malformed legacy values', () => {
    const stores = storage({ SynbioHub: '{not json', Flapjack: JSON.stringify([]) });

    migrateLegacyStorage(stores);

    assert.deepEqual(listRepositories(undefined, stores), []);
    assert.equal(stores.localStorage.getItem('synbiosuite.credentials-migrated.v1'), '1');
});

test('is idempotent and merges partially migrated records', () => {
    const stores = storage({
        SynbioHub: JSON.stringify([{ registryURL: 'https://sbh.example', authtoken: 'legacy-token' }]),
        'synbiosuite.repositories.v1': JSON.stringify({ version: 1, repositories: [{ provider: 'synbiohub', registryURL: 'https://sbh.example', registryAPI: 'https://custom-api.example', registryPrefix: 'https://sbh.example', name: 'Custom' }] }),
    });

    migrateLegacyStorage(stores);
    migrateLegacyStorage(stores);

    assert.deepEqual(listRepositories('synbiohub', stores), [{ provider: 'synbiohub', registryURL: 'https://sbh.example', registryAPI: 'https://custom-api.example', registryPrefix: 'https://sbh.example', name: 'Custom' }]);
    assert.equal(getCredentialsForRepository('synbiohub', 'https://sbh.example', stores).accessToken, 'legacy-token');
    setCredentials('synbiohub', 'https://sbh.example', { authtoken: 'new-token' }, stores);
    clearCredentials('synbiohub', 'https://sbh.example', stores);
    assert.equal(getCredentialsForRepository('synbiohub', 'https://sbh.example', stores), null);
});
