import { useCallback, useEffect, useState } from 'react';

import {
    listRepositories,
    removeRepository,
    setRepository,
    subscribeRepositories,
} from './credentialStore.js';

/**
 * React bridge for non-secret repository metadata.
 *
 * Consumers retain the familiar `[repositories, setRepositories]` interface while
 * all browser storage keys and credential separation stay inside credentialStore.
 */
export function useRepositoryStorage(provider) {
    const [repositories, setRepositoriesState] = useState(
        () => listRepositories(provider),
    );

    useEffect(() => {
        setRepositoriesState(listRepositories(provider));
        return subscribeRepositories(provider, setRepositoriesState);
    }, [provider]);

    const setRepositories = useCallback((nextValue) => {
        setRepositoriesState((current) => {
            const proposed = typeof nextValue === 'function'
                ? nextValue(current)
                : nextValue;
            const next = Array.isArray(proposed) ? proposed : [];
            const nextURLs = new Set(
                next.map((repository) => repository?.registryURL).filter(Boolean),
            );

            current.forEach((repository) => {
                if (repository?.registryURL && !nextURLs.has(repository.registryURL)) {
                    removeRepository(provider, repository.registryURL);
                }
            });
            next.forEach((repository) => {
                if (repository?.registryURL) setRepository(provider, repository);
            });
            return listRepositories(provider);
        });
    }, [provider]);

    return [repositories, setRepositories];
}
