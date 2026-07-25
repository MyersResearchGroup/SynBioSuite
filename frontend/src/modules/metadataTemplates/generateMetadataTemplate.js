import { XLSM_MIME_TYPE, fetchTemplate } from './browserDownload';
import { getQueryCacheKey } from './templateManifest';
import { getSynBioHubProfile, queryCollectionMembers } from './synBioHubClient';
import { populateXlsm } from './xlsmPopulation';

export async function generateMetadataTemplate({ configuration, collectionUri, apiUrl, authToken, signal, onStatus }) {
    if (!configuration) throw new Error('This object type does not have a metadata template.');
    if (!configuration.populations.length) {
        onStatus?.('Downloading template');
        const template = await fetchTemplate(configuration.templateUrl, signal);
        return { blob: new Blob([template], { type: XLSM_MIME_TYPE }), rows: [], raw: true };
    }
    onStatus?.('Querying SynBioHub');
    const profile = await getSynBioHubProfile({ apiUrl, authToken, signal });
    const cache = new Map();
    const populations = await Promise.all(configuration.populations.map(async (population) => {
        const key = getQueryCacheKey(population);
        if (!cache.has(key)) cache.set(key, queryCollectionMembers({ apiUrl, authToken, userGraph: profile.graphUri, collectionUri, ...population, signal }));
        return { population, rows: await cache.get(key) };
    }));
    onStatus?.('Downloading template');
    const template = await fetchTemplate(configuration.templateUrl, signal);
    onStatus?.('Populating template');
    const output = populateXlsm(template, populations);
    return { blob: new Blob([output.bytes], { type: XLSM_MIME_TYPE }), rows: populations.flatMap((item) => item.rows), raw: false, changedParts: output.changedParts, profile };
}
