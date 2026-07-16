const METADATA_KEY = 'synbiosuite.repositories.v1';
const CREDENTIALS_KEY = 'synbiosuite.credentials.v1';
const PRIMARY_KEY = 'synbiosuite.primary-repositories.v1';
const MIGRATION_KEY = 'synbiosuite.credentials-migrated.v1';

const LEGACY_STORES = {
    synbiohub: 'SynbioHub',
    flapjack: 'Flapjack',
};

const TOKEN_FIELDS = new Set([
    'authtoken',
    'refresh',
    'accessToken',
    'refreshToken',
    'token',
    'password',
]);

function getBrowserStorage(name) {
    if (typeof window === 'undefined') return null;
    try {
        return window[name] || null;
    } catch {
        return null;
    }
}

function resolveStorage(storage = {}) {
    return {
        localStorage: storage.localStorage || getBrowserStorage('localStorage'),
        sessionStorage: storage.sessionStorage || getBrowserStorage('sessionStorage'),
    };
}

function parse(value, fallback) {
    if (!value) return fallback;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function read(localStorage, key, fallback) {
    if (!localStorage) return fallback;
    try {
        return parse(localStorage.getItem(key), fallback);
    } catch {
        return fallback;
    }
}

function write(storage, key, value) {
    if (!storage) return;
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage can be unavailable (for example, private browsing). Keep the API safe.
    }
}

function has(storage, key) {
    if (!storage) return false;
    try {
        return storage.getItem(key) !== null;
    } catch {
        return false;
    }
}

function repositoryId(provider, registryURL) {
    return `${provider}:${registryURL}`;
}

function normalizeProvider(provider) {
    const normalized = String(provider || '').toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(LEGACY_STORES, normalized)) {
        throw new Error(`Unsupported repository provider: ${provider}`);
    }
    return normalized;
}

function metadataFor(provider, repository = {}) {
    const registryURL = repository.registryURL || repository.url;
    if (!registryURL || typeof registryURL !== 'string') return null;

    return Object.entries(repository).reduce((metadata, [key, value]) => {
        if (!TOKEN_FIELDS.has(key) && value !== undefined) metadata[key] = value;
        return metadata;
    }, {
        provider,
        registryURL,
        registryAPI: repository.registryAPI || registryURL,
        registryPrefix: repository.registryPrefix || registryURL,
    });
}

function credentialsFor(repository = {}) {
    const accessToken = repository.accessToken || repository.authtoken || repository.token;
    const refreshToken = repository.refreshToken || repository.refresh;
    return {
        ...(accessToken ? { accessToken } : {}),
        ...(refreshToken ? { refreshToken } : {}),
    };
}

function getMetadata(localStorage) {
    const value = read(localStorage, METADATA_KEY, { version: 1, repositories: [] });
    return {
        version: 1,
        repositories: Array.isArray(value.repositories) ? value.repositories : [],
    };
}

function getCredentials(sessionStorage) {
    const value = read(sessionStorage, CREDENTIALS_KEY, { version: 1, credentials: {} });
    return {
        version: 1,
        credentials: value.credentials && typeof value.credentials === 'object' ? value.credentials : {},
    };
}

function getPrimary(localStorage) {
    const value = read(localStorage, PRIMARY_KEY, { version: 1, repositories: {} });
    return {
        version: 1,
        repositories: value.repositories && typeof value.repositories === 'object' ? value.repositories : {},
    };
}

function mergeRepository(repositories, repository) {
    const index = repositories.findIndex((item) =>
        item.provider === repository.provider && item.registryURL === repository.registryURL
    );
    if (index === -1) return [...repositories, repository];

    const merged = [...repositories];
    merged[index] = { ...merged[index], ...repository };
    return merged;
}

function mergeMigratedRepository(repositories, repository) {
    const index = repositories.findIndex((item) =>
        item.provider === repository.provider && item.registryURL === repository.registryURL
    );
    if (index === -1) return [...repositories, repository];

    const merged = [...repositories];
    // The central schema is authoritative when a prior migration was only partial.
    // This prevents a sparse legacy record from discarding a custom API or prefix.
    merged[index] = { ...repository, ...merged[index] };
    return merged;
}

function legacyMetadata(repository) {
    return Object.entries(repository).reduce((result, [key, value]) => {
        if (!TOKEN_FIELDS.has(key)) result[key] = value;
        return result;
    }, {});
}

/**
 * Move the legacy repository records into provider-neutral metadata and
 * session-scoped credentials. It is safe to call repeatedly.
 */
export function migrateLegacyStorage(storage) {
    const { localStorage, sessionStorage } = resolveStorage(storage);
    if (!localStorage || !sessionStorage || has(localStorage, MIGRATION_KEY)) return;

    let metadata = getMetadata(localStorage);
    let credentials = getCredentials(sessionStorage);

    Object.entries(LEGACY_STORES).forEach(([provider, legacyKey]) => {
        const legacyRecords = read(localStorage, legacyKey, []);
        if (!Array.isArray(legacyRecords)) return;

        const sanitizedRecords = [];
        legacyRecords.forEach((record) => {
            if (!record || typeof record !== 'object') return;
            const repository = metadataFor(provider, record);
            if (!repository) return;

            metadata.repositories = mergeMigratedRepository(metadata.repositories, repository);
            const credentialsToStore = credentialsFor(record);
            if (Object.keys(credentialsToStore).length > 0) {
                credentials.credentials[repositoryId(provider, repository.registryURL)] = credentialsToStore;
            }
            sanitizedRecords.push(legacyMetadata(repository));
        });

        // Keep a metadata-only compatibility record for consumers outside this migration.
        write(localStorage, legacyKey, sanitizedRecords);
    });

    write(localStorage, METADATA_KEY, metadata);
    write(sessionStorage, CREDENTIALS_KEY, credentials);
    try {
        localStorage.setItem(MIGRATION_KEY, '1');
    } catch {
        // A later call can safely retry when persistent storage is unavailable.
    }
}

function ensureMigration(storage) {
    migrateLegacyStorage(storage);
    return resolveStorage(storage);
}

export function listRepositories(provider, storage) {
    const { localStorage } = ensureMigration(storage);
    const repositories = getMetadata(localStorage).repositories;
    return provider ? repositories.filter((item) => item.provider === normalizeProvider(provider)) : repositories;
}

export function getRepository(provider, registryURL, storage) {
    const normalizedProvider = normalizeProvider(provider);
    return listRepositories(normalizedProvider, storage)
        .find((item) => item.registryURL === registryURL) || null;
}

export function setRepository(provider, repository, storage) {
    const normalizedProvider = normalizeProvider(provider);
    const { localStorage } = ensureMigration(storage);
    const normalizedRepository = metadataFor(normalizedProvider, repository);
    if (!normalizedRepository) throw new Error('A repository registryURL is required');

    const metadata = getMetadata(localStorage);
    metadata.repositories = mergeRepository(metadata.repositories, normalizedRepository);
    write(localStorage, METADATA_KEY, metadata);
    return normalizedRepository;
}

export function removeRepository(provider, registryURL, storage) {
    const normalizedProvider = normalizeProvider(provider);
    const { localStorage, sessionStorage } = ensureMigration(storage);
    const metadata = getMetadata(localStorage);
    metadata.repositories = metadata.repositories.filter((item) =>
        item.provider !== normalizedProvider || item.registryURL !== registryURL
    );
    write(localStorage, METADATA_KEY, metadata);
    clearCredentials(normalizedProvider, registryURL, { localStorage, sessionStorage });

    const primary = getPrimary(localStorage);
    if (primary.repositories[normalizedProvider] === registryURL) {
        delete primary.repositories[normalizedProvider];
        write(localStorage, PRIMARY_KEY, primary);
    }
}

export function getCredentialsForRepository(provider, registryURL, storage) {
    const normalizedProvider = normalizeProvider(provider);
    const { sessionStorage } = ensureMigration(storage);
    return getCredentials(sessionStorage).credentials[repositoryId(normalizedProvider, registryURL)] || null;
}

export function setCredentials(provider, registryURL, credentials, storage) {
    const normalizedProvider = normalizeProvider(provider);
    const { sessionStorage } = ensureMigration(storage);
    const value = credentialsFor(credentials);
    const storedCredentials = getCredentials(sessionStorage);
    const id = repositoryId(normalizedProvider, registryURL);

    if (Object.keys(value).length === 0) delete storedCredentials.credentials[id];
    else storedCredentials.credentials[id] = value;
    write(sessionStorage, CREDENTIALS_KEY, storedCredentials);
    return Object.keys(value).length ? value : null;
}

export function clearCredentials(provider, registryURL, storage) {
    const normalizedProvider = normalizeProvider(provider);
    const { sessionStorage } = ensureMigration(storage);
    const storedCredentials = getCredentials(sessionStorage);
    delete storedCredentials.credentials[repositoryId(normalizedProvider, registryURL)];
    write(sessionStorage, CREDENTIALS_KEY, storedCredentials);
}

export function getPrimaryRepository(provider, storage) {
    const normalizedProvider = normalizeProvider(provider);
    const { localStorage } = ensureMigration(storage);
    return getPrimary(localStorage).repositories[normalizedProvider] || '';
}

export function setPrimaryRepository(provider, registryURL, storage) {
    const normalizedProvider = normalizeProvider(provider);
    const { localStorage } = ensureMigration(storage);
    const primary = getPrimary(localStorage);
    if (registryURL) primary.repositories[normalizedProvider] = registryURL;
    else delete primary.repositories[normalizedProvider];
    write(localStorage, PRIMARY_KEY, primary);
}
