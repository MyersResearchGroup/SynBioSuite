import { flapjackAdapter } from './flapjack.js';
import { synBioHubAdapter } from './synbiohub.js';

export { AUTH_ERROR_CODES, AuthProviderError } from './errors.js';
export { createFlapjackAdapter, flapjackAdapter } from './flapjack.js';
export { createSynBioHubAdapter, synBioHubAdapter } from './synbiohub.js';

const providers = Object.freeze({
    flapjack: flapjackAdapter,
    synbiohub: synBioHubAdapter,
});

export function getAuthProvider(provider) {
    const adapter = providers[String(provider || '').toLowerCase()];
    if (!adapter) throw new Error(`Unsupported authentication provider: ${provider}`);
    return adapter;
}
