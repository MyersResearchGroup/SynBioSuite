import { normalizeOptionalIri } from './templateManifest';

export const DEFAULT_PAGE_SIZE = 500;
export const DEFAULT_TIMEOUT_MS = 30000;

function error(message, code, cause) {
    const result = new Error(message);
    result.code = code;
    if (cause) result.cause = cause;
    return result;
}

export function normalizeApiUrl(apiUrl) {
    if (typeof apiUrl !== 'string' || apiUrl.trim() === '') throw error('A SynBioHub API endpoint is required.', 'INVALID_API_URL');
    return apiUrl.trim().replace(/\/+$/, '');
}

export function assertHttpIri(value, label = 'IRI') {
    const candidate = normalizeOptionalIri(value);
    if (!candidate) return null;
    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
        return parsed.href;
    } catch (_) {
        throw error(`${label} must be an absolute HTTP(S) IRI.`, 'INVALID_IRI');
    }
}

function withTimeout(signal, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    if (signal) signal.addEventListener('abort', abort, { once: true });
    return { signal: controller.signal, dispose: () => { clearTimeout(timer); if (signal) signal.removeEventListener('abort', abort); } };
}

async function requestJson(url, options, signal) {
    try {
        const response = await fetch(url, { ...options, signal });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) throw error('SynBioHub authentication failed. Please log in again.', 'AUTH_FAILED');
            throw error(`SynBioHub request failed (${response.status}).`, 'HTTP_FAILED');
        }
        try {
            return await response.json();
        } catch (_) {
            throw error('SynBioHub returned malformed JSON.', 'MALFORMED_RESPONSE');
        }
    } catch (caught) {
        if (caught?.name === 'AbortError') throw error('SynBioHub request was cancelled or timed out.', 'ABORTED');
        if (caught?.code) throw caught;
        throw error('Unable to reach SynBioHub.', 'NETWORK_FAILED', caught);
    }
}

export async function getSynBioHubProfile({ apiUrl, authToken, signal, timeoutMs }) {
    if (!authToken) throw error('No SynBioHub authentication token is available. Please log in again.', 'MISSING_TOKEN');
    const timeout = withTimeout(signal, timeoutMs);
    try {
        const profile = await requestJson(`${normalizeApiUrl(apiUrl)}/profile`, {
            method: 'GET',
            headers: { Accept: 'application/json', 'X-authorization': authToken },
        }, timeout.signal);
        if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw error('SynBioHub returned an invalid profile.', 'MALFORMED_RESPONSE');
        if (!profile.graphUri) throw error('SynBioHub profile does not provide graphUri; cannot safely query collection members.', 'MISSING_GRAPH_URI');
        return { ...profile, graphUri: assertHttpIri(profile.graphUri, 'Profile graphUri') };
    } finally {
        timeout.dispose();
    }
}

export function buildCollectionMembersQuery({ userGraph, collectionUri, role, sbolType, rdfType, limit = DEFAULT_PAGE_SIZE, offset = 0 }) {
    const graph = assertHttpIri(userGraph, 'User graph');
    const collection = assertHttpIri(collectionUri, 'Collection URI');
    const filters = [
        [normalizeOptionalIri(role), 'sbol:role', 'Role'],
        [normalizeOptionalIri(sbolType), 'sbol:type', 'SBOL type'],
        [normalizeOptionalIri(rdfType), 'rdf:type', 'RDF class'],
    ].filter(([value]) => value).map(([value, predicate, label]) => `  ?uri ${predicate} <${assertHttpIri(value, label)}> .`);
    if (!Number.isInteger(limit) || limit <= 0 || !Number.isInteger(offset) || offset < 0) throw error('Invalid SPARQL page bounds.', 'INVALID_PAGE');
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX sbol: <http://sbols.org/v2#>\nPREFIX dcterms: <http://purl.org/dc/terms/>\n\nSELECT DISTINCT ?uri ?name ?displayId\nFROM <${graph}>\nWHERE {\n  <${collection}> sbol:member ?uri .\n\n  OPTIONAL { ?uri dcterms:title ?name . }\n  OPTIONAL { ?uri sbol:displayId ?displayId . }\n${filters.join('\n')}\n}\nORDER BY ?uri\nLIMIT ${limit}\nOFFSET ${offset}`;
}

function bindingText(binding) {
    return typeof binding?.value === 'string' ? binding.value.trim() : '';
}

function uriLabel(uri) {
    try {
        const parsed = new URL(uri);
        return decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname);
    } catch (_) { return ''; }
}

export function normalizeCollectionBindings(bindings) {
    if (!Array.isArray(bindings)) throw error('SynBioHub SPARQL results are missing bindings.', 'MALFORMED_RESPONSE');
    const byUri = new Map();
    bindings.forEach((binding) => {
        const uri = bindingText(binding?.uri);
        try { assertHttpIri(uri, 'Result URI'); } catch (_) { return; }
        const named = bindingText(binding?.name);
        const displayId = bindingText(binding?.displayId);
        const fallback = uriLabel(uri);
        const label = named || displayId || fallback;
        const rank = named ? 0 : displayId ? 1 : 2;
        if (!label) return;
        const previous = byUri.get(uri);
        if (!previous || rank < previous.rank || (rank === previous.rank && label.localeCompare(previous.name) < 0)) {
            byUri.set(uri, { name: label, uri, rank });
        }
    });
    return [...byUri.values()].map(({ name, uri }) => ({ name, uri })).sort((a, b) => a.name.localeCompare(b.name) || a.uri.localeCompare(b.uri));
}

export async function queryCollectionMembers({ apiUrl, authToken, userGraph, collectionUri, role, sbolType, rdfType, signal, pageSize = DEFAULT_PAGE_SIZE, timeoutMs }) {
    if (!authToken) throw error('No SynBioHub authentication token is available. Please log in again.', 'MISSING_TOKEN');
    const allBindings = [];
    for (let offset = 0; ; offset += pageSize) {
        const timeout = withTimeout(signal, timeoutMs);
        try {
            const query = buildCollectionMembersQuery({ userGraph, collectionUri, role, sbolType, rdfType, limit: pageSize, offset });
            const result = await requestJson(`${normalizeApiUrl(apiUrl)}/sparql`, {
                method: 'POST',
                headers: {
                    Accept: 'application/sparql-results+json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-authorization': authToken,
                },
                body: new URLSearchParams({ query }).toString(),
            }, timeout.signal);
            const bindings = result?.results?.bindings;
            if (!Array.isArray(bindings)) throw error('SynBioHub returned invalid SPARQL result bindings.', 'MALFORMED_RESPONSE');
            allBindings.push(...bindings);
            if (bindings.length < pageSize) break;
        } finally {
            timeout.dispose();
        }
    }
    return normalizeCollectionBindings(allBindings);
}
