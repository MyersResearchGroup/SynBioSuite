import { useCallback, useState } from 'react';
import {
    clearCredentials,
    getCredentialsForRepository,
    listRepositories,
    removeRepository,
    setCredentials,
    setRepository,
} from './credentialStore';

function toLegacyShape(provider, repository) {
    const credentials = getCredentialsForRepository(provider, repository.registryURL) || {};
    return {
        ...repository,
        authtoken: credentials.accessToken || '',
        refresh: credentials.refreshToken || '',
    };
}

function readRepositories(provider) {
    return listRepositories(provider).map((repository) => toLegacyShape(provider, repository));
}

/**
 * Compatibility hook for existing login components. It exposes repository
 * records in their former shape without allowing credentials into localStorage.
 */
export function useRepositoryStorage(provider) {
    const [repositories, setRepositories] = useState(() => readRepositories(provider));

    const persist = useCallback((nextValue) => {
        const current = readRepositories(provider);
        const next = typeof nextValue === 'function' ? nextValue(current) : nextValue;
        const normalizedNext = Array.isArray(next) ? next : [];
        const nextUrls = new Set(normalizedNext.map((repository) => repository.registryURL));

        current.forEach((repository) => {
            if (!nextUrls.has(repository.registryURL)) removeRepository(provider, repository.registryURL);
        });

        normalizedNext.forEach((repository) => {
            setRepository(provider, repository);
            if (repository.authtoken || repository.refresh || repository.accessToken || repository.refreshToken) {
                setCredentials(provider, repository.registryURL, repository);
            } else {
                clearCredentials(provider, repository.registryURL);
            }
        });

        setRepositories(readRepositories(provider));
    }, [provider]);

    return [repositories, persist];
}
