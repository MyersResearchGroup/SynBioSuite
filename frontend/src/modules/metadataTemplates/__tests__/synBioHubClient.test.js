import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCollectionMembersQuery, getSynBioHubProfile, normalizeCollectionBindings, queryCollectionMembers } from '../synBioHubClient';

const base = { userGraph: 'https://synbiohub.org/user/a', collectionUri: 'https://synbiohub.org/user/a/c/1' };

describe('SynBioHub query construction', () => {
    it.each([
        [{}, []],
        [{ role: 'https://example.org/role' }, ['sbol:role <https://example.org/role>']],
        [{ sbolType: 'https://example.org/type' }, ['sbol:type <https://example.org/type>']],
        [{ rdfType: 'https://example.org/class' }, ['rdf:type <https://example.org/class>']],
        [{ role: 'https://example.org/role', sbolType: 'https://example.org/type', rdfType: 'https://example.org/class' }, ['sbol:role', 'sbol:type', 'rdf:type']],
        [{ role: ' any ', sbolType: '', rdfType: null }, []],
    ])('adds only configured filters', (filters, expected) => {
        const query = buildCollectionMembersQuery({ ...base, ...filters, limit: 500, offset: 1000 });
        expected.forEach((fragment) => expect(query).toContain(fragment));
        expect(query).toContain('LIMIT 500');
        expect(query).toContain('OFFSET 1000');
    });

    it('rejects unsafe IRIs', () => expect(() => buildCollectionMembersQuery({ ...base, role: 'javascript:alert(1)' })).toThrow('HTTP(S)'));
});

describe('SynBioHub responses', () => {
    afterEach(() => vi.restoreAllMocks());

    it('normalizes labels, duplicates, and sorting deterministically', () => {
        expect(normalizeCollectionBindings([
            { uri: { value: 'https://example.org/z' }, displayId: { value: 'zeta' } },
            { uri: { value: 'https://example.org/a/thing' } },
            { uri: { value: 'https://example.org/z' }, name: { value: 'Alpha title' } },
            { uri: { value: 'not a uri' }, name: { value: 'discard' } },
        ])).toEqual([
            { name: 'Alpha title', uri: 'https://example.org/z' },
            { name: 'thing', uri: 'https://example.org/a/thing' },
        ]);
    });

    it('uses profile headers without putting the token in the URL', async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ graphUri: 'https://synbiohub.org/user/a' }) });
        vi.stubGlobal('fetch', fetch);
        await getSynBioHubProfile({ apiUrl: 'https://api.synbiohub.org/', authToken: 'secret-token' });
        expect(fetch.mock.calls[0][0]).toBe('https://api.synbiohub.org/profile');
        expect(fetch.mock.calls[0][1].headers['X-authorization']).toBe('secret-token');
        expect(fetch.mock.calls[0][0]).not.toContain('secret-token');
    });

    it('reports auth and missing graph failures', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
        await expect(getSynBioHubProfile({ apiUrl: 'https://api.example.org', authToken: 'x' })).rejects.toMatchObject({ code: 'AUTH_FAILED' });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
        await expect(getSynBioHubProfile({ apiUrl: 'https://api.example.org', authToken: 'x' })).rejects.toMatchObject({ code: 'MISSING_GRAPH_URI' });
    });

    it('classifies malformed and aborted responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('bad json'); } }));
        await expect(getSynBioHubProfile({ apiUrl: 'https://api.example.org', authToken: 'x' })).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        await expect(queryCollectionMembers({ ...base, apiUrl: 'https://api.example.org', authToken: 'x' })).rejects.toMatchObject({ code: 'ABORTED' });
    });

    it('paginates POST SPARQL results', async () => {
        const fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ results: { bindings: [{ uri: { value: 'https://x/1' } }, { uri: { value: 'https://x/2' } }] } }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ results: { bindings: [{ uri: { value: 'https://x/3' } }] } }) });
        vi.stubGlobal('fetch', fetch);
        const rows = await queryCollectionMembers({ ...base, apiUrl: 'https://api.example.org', authToken: 'secret', pageSize: 2 });
        expect(rows).toHaveLength(3);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch.mock.calls[0][0]).toBe('https://api.example.org/sparql');
        expect(fetch.mock.calls[0][1].method).toBe('POST');
        expect(fetch.mock.calls[1][1].body).toContain('OFFSET+2');
    });

    it('rejects malformed SPARQL responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: {} }) }));
        await expect(queryCollectionMembers({ ...base, apiUrl: 'https://api.example.org', authToken: 'x' })).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
    });
});
