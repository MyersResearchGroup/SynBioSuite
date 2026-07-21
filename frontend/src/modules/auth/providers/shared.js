export function normalizeInstance(instance) {
    if (typeof instance !== 'string' || !instance.trim()) {
        throw new TypeError('A repository API URL is required.');
    }
    return instance.trim().replace(/\/+$/, '');
}

export function bearerHeaders(accessToken) {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export function synBioHubHeaders(accessToken) {
    return accessToken ? { 'X-authorization': accessToken } : {};
}
