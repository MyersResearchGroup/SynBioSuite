const CREDENTIALS_KEY = 'synbiosuite.credentials.v1';
const PRIMARY_REPOSITORIES_KEY = 'synbiosuite.primary-repositories.v1';
const REPOSITORY_EVENT = 'synbiosuite:repositories-changed';

const PROVIDERS = Object.freeze({
    synbiohub: Object.freeze({ storageKey: 'SynbioHub' }),
    flapjack: Object.freeze({ storageKey: 'Flapjack' }),
});

const SECRET_FIELDS = new Set([
    'accessToken',
    'authToken',
    'authtoken',
    'fj_pass',
    'fj_token',
    'password',
    'refresh',
    'refreshToken',
    'refresh_token',
    'sbh_pass',
    'sbh_token',
]);

function providerName(provider) {
    const normalized = String(provider || '').toLowerCase().replace(/[^a-z]/g, '');
    if (normalized === 'sbh' || normalized === 'synbiohub') return 'synbiohub';
    if (normalized === 'fj' || normalized === 'flapjack') return 'flapjack';
    throw new TypeError(`Unsupported authentication provider: ${provider}`);
}

function repositoryIdentity(registryURL) {
    if (typeof registryURL !== 'string' || !registryURL.trim()) {
        throw new TypeError('registryURL is required.');
    }
    return registryURL.trim().replace(/\/+$/, '');
}

function safeParse(storage, key, fallback) {
    if (!storage) return fallback;
    try {
        const value = JSON.parse(storage.getItem(key));
        return value ?? fallback;
    } catch (_error) {
        return fallback;
    }
}

function stripSecrets(value) {
    if (Array.isArray(value)) return value.map(stripSecrets);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) => !SECRET_FIELDS.has(key))
            .map(([key, child]) => [key, stripSecrets(child)]),
    );
}

function credentialsFrom(record = {}) {
    const accessToken = record.accessToken
        || record.authToken
        || record.authtoken
        || null;
    const refreshToken = record.refreshToken
        || record.refresh_token
        || record.refresh
        || null;
    return {
        ...(accessToken ? { accessToken } : {}),
        ...(refreshToken ? { refreshToken } : {}),
    };
}

function cleanCredentials(credentials = {}) {
    if (!credentials || typeof credentials !== 'object') return {};
    return {
        ...(typeof credentials.accessToken === 'string' && credentials.accessToken
            ? { accessToken: credentials.accessToken }
            : {}),
        ...(typeof credentials.refreshToken === 'string' && credentials.refreshToken
            ? { refreshToken: credentials.refreshToken }
            : {}),
    };
}

function browserStorage(name) {
    try {
        return globalThis?.[name] || null;
    } catch (_error) {
        return null;
    }
}

export function createCredentialStore({
    localStorage = browserStorage('localStorage'),
    sessionStorage = browserStorage('sessionStorage'),
} = {}) {
    const repositoryConfig = (provider) => PROVIDERS[providerName(provider)];

    const readRepositories = (provider) => {
        const repositories = safeParse(
            localStorage,
            repositoryConfig(provider).storageKey,
            [],
        );
        return Array.isArray(repositories) ? repositories.map(stripSecrets) : [];
    };

    const writeRepositories = (provider, repositories) => {
        if (!localStorage) return;
        const name = providerName(provider);
        localStorage.setItem(
            repositoryConfig(provider).storageKey,
            JSON.stringify(repositories.map(stripSecrets)),
        );
        if (typeof globalThis.dispatchEvent === 'function'
            && typeof globalThis.CustomEvent === 'function') {
            globalThis.dispatchEvent(new CustomEvent(REPOSITORY_EVENT, {
                detail: { provider: name },
            }));
        }
    };

    const readCredentialMap = () => {
        const value = safeParse(sessionStorage, CREDENTIALS_KEY, {});
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    };

    const writeCredentialMap = (value) => {
        if (!sessionStorage) return;
        if (Object.keys(value).length) {
            sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(value));
        } else {
            sessionStorage.removeItem(CREDENTIALS_KEY);
        }
    };

    const readPrimaryRepositories = () => {
        const value = safeParse(localStorage, PRIMARY_REPOSITORIES_KEY, {});
        const repositories = value?.repositories || value;
        return repositories && typeof repositories === 'object' && !Array.isArray(repositories)
            ? repositories
            : {};
    };

    const writePrimaryRepositories = (repositories) => {
        if (!localStorage) return;
        localStorage.setItem(PRIMARY_REPOSITORIES_KEY, JSON.stringify({
            version: 1,
            repositories,
        }));
    };

    const getPrimaryRepository = (provider) => (
        readPrimaryRepositories()[providerName(provider)] || ''
    );

    const setPrimaryRepository = (provider, registryURL) => {
        const name = providerName(provider);
        const repositories = readPrimaryRepositories();
        if (registryURL) repositories[name] = repositoryIdentity(registryURL);
        else delete repositories[name];
        writePrimaryRepositories(repositories);
    };

    const getCredentialsForRepository = (provider, registryURL) => {
        const name = providerName(provider);
        const identity = repositoryIdentity(registryURL);
        return cleanCredentials(readCredentialMap()[name]?.[identity]);
    };

    const setCredentials = (provider, registryURL, credentials) => {
        const name = providerName(provider);
        const identity = repositoryIdentity(registryURL);
        const clean = cleanCredentials(credentials);
        const all = readCredentialMap();
        if (!Object.keys(clean).length) {
            if (all[name]) delete all[name][identity];
        } else {
            all[name] = { ...(all[name] || {}), [identity]: clean };
        }
        if (all[name] && !Object.keys(all[name]).length) delete all[name];
        writeCredentialMap(all);
        return clean;
    };

    const clearCredentials = (provider, registryURL) => {
        const name = providerName(provider);
        const identity = repositoryIdentity(registryURL);
        const all = readCredentialMap();
        if (all[name]) delete all[name][identity];
        if (all[name] && !Object.keys(all[name]).length) delete all[name];
        writeCredentialMap(all);
    };

    const listCredentials = (provider) => {
        const all = readCredentialMap();
        const names = provider ? [providerName(provider)] : Object.keys(PROVIDERS);
        return names.flatMap((name) => Object.entries(all[name] || {}).map(
            ([registryURL, credentials]) => ({
                provider: name,
                registryURL,
                credentials: cleanCredentials(credentials),
            }),
        ));
    };

    const listRepositories = (provider) => readRepositories(provider);

    const getRepository = (provider, registryURL) => {
        const identity = repositoryIdentity(registryURL);
        return readRepositories(provider).find(
            (repository) => repository.registryURL
                && repositoryIdentity(repository.registryURL) === identity,
        ) || null;
    };

    const setRepository = (provider, repository) => {
        if (!repository || typeof repository !== 'object') {
            throw new TypeError('repository must be an object.');
        }
        const identity = repositoryIdentity(repository.registryURL);
        const legacyCredentials = credentialsFrom(repository);
        const clean = stripSecrets({
            ...repository,
            registryURL: repository.registryURL.trim(),
            registryAPI: repository.registryAPI || repository.registryURL.trim(),
            registryPrefix: repository.registryPrefix || repository.registryURL.trim(),
        });
        const repositories = readRepositories(provider);
        const index = repositories.findIndex(
            (item) => item.registryURL && repositoryIdentity(item.registryURL) === identity,
        );
        if (index === -1) repositories.push(clean);
        else repositories[index] = { ...repositories[index], ...clean };
        writeRepositories(provider, repositories);
        if (Object.keys(legacyCredentials).length) {
            setCredentials(provider, repository.registryURL, legacyCredentials);
        }
        return clean;
    };

    const removeRepository = (provider, registryURL) => {
        const name = providerName(provider);
        const identity = repositoryIdentity(registryURL);
        writeRepositories(provider, readRepositories(provider).filter(
            (repository) => !repository.registryURL
                || repositoryIdentity(repository.registryURL) !== identity,
        ));
        clearCredentials(provider, registryURL);
        if (getPrimaryRepository(name) === identity) {
            setPrimaryRepository(name, '');
        }
    };

    const subscribeRepositories = (provider, listener) => {
        if (typeof listener !== 'function') {
            throw new TypeError('listener must be a function.');
        }
        const name = providerName(provider);
        const storageKey = repositoryConfig(name).storageKey;
        if (typeof globalThis.addEventListener !== 'function') return () => {};
        const onStorage = (event) => {
            if (event.key === storageKey) listener(readRepositories(name));
        };
        const onRepositoryChange = (event) => {
            if (event.detail?.provider === name) listener(readRepositories(name));
        };
        globalThis.addEventListener('storage', onStorage);
        globalThis.addEventListener(REPOSITORY_EVENT, onRepositoryChange);
        return () => {
            globalThis.removeEventListener('storage', onStorage);
            globalThis.removeEventListener(REPOSITORY_EVENT, onRepositoryChange);
        };
    };

    const migrateLegacyStorage = () => {
        let repositoriesMigrated = 0;
        let credentialsMigrated = 0;
        for (const name of Object.keys(PROVIDERS)) {
            const storageKey = PROVIDERS[name].storageKey;
            const raw = localStorage?.getItem(storageKey) ?? null;
            let parsed = null;
            try {
                parsed = raw === null ? null : JSON.parse(raw);
            } catch (_error) {
                parsed = null;
            }
            const validArray = Array.isArray(parsed);
            const repositories = validArray ? parsed : [];
            const cleaned = [];
            for (const repository of repositories) {
                if (!repository || typeof repository !== 'object' || !repository.registryURL) {
                    continue;
                }
                const credentials = credentialsFrom(repository);
                if (Object.keys(credentials).length) {
                    const existing = getCredentialsForRepository(name, repository.registryURL);
                    setCredentials(name, repository.registryURL, {
                        ...credentials,
                        ...existing,
                    });
                    credentialsMigrated += 1;
                }
                const sanitized = stripSecrets(repository);
                if (JSON.stringify(sanitized) !== JSON.stringify(repository)) {
                    repositoriesMigrated += 1;
                }
                cleaned.push(sanitized);
            }
            if (localStorage && ((raw !== null && !validArray)
                || JSON.stringify(cleaned) !== JSON.stringify(repositories))) {
                localStorage.setItem(storageKey, JSON.stringify(cleaned));
            }
        }
        return { repositoriesMigrated, credentialsMigrated };
    };

    return Object.freeze({
        migrateLegacyStorage,
        listRepositories,
        getRepository,
        setRepository,
        removeRepository,
        subscribeRepositories,
        listCredentials,
        getCredentialsForRepository,
        setCredentials,
        clearCredentials,
        getPrimaryRepository,
        setPrimaryRepository,
    });
}

const defaultStore = createCredentialStore();
defaultStore.migrateLegacyStorage();

export const migrateLegacyStorage = defaultStore.migrateLegacyStorage;
export const listRepositories = defaultStore.listRepositories;
export const getRepository = defaultStore.getRepository;
export const setRepository = defaultStore.setRepository;
export const removeRepository = defaultStore.removeRepository;
export const subscribeRepositories = defaultStore.subscribeRepositories;
export const listCredentials = defaultStore.listCredentials;
export const getCredentialsForRepository = defaultStore.getCredentialsForRepository;
export const setCredentials = defaultStore.setCredentials;
export const clearCredentials = defaultStore.clearCredentials;
export const getPrimaryRepository = defaultStore.getPrimaryRepository;
export const setPrimaryRepository = defaultStore.setPrimaryRepository;
