import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const token = process.env.SBH_TEST_TOKEN;
if (!token) throw new Error('SBH_TEST_TOKEN is required for this opt-in live test.');

const API_URL = 'https://api.synbiohub.org';
const COLLECTION_URI = 'https://synbiohub.org/user/Gon/MD5_Plasmids/MD5_Plasmids_collection/1';
const EXPECTED_GRAPH = 'https://synbiohub.org/user/Gon';
const ROLE = 'http://identifiers.org/so/SO:0000637';
const TEMPLATE_URL = 'https://raw.github.com/SynBioDex/Excel-to-SBOL/master/resources/templates/Strains.xlsm';
const outputDirectory = process.env.SBH_TEST_OUTPUT_DIR || join(process.cwd(), '..', 'tmp', 'sbh-template-live');

function nodeFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const request = httpsRequest(parsed, { method: options.method || 'GET', headers: options.headers }, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const body = Buffer.concat(chunks);
                resolve({
                    ok: response.statusCode >= 200 && response.statusCode < 300,
                    status: response.statusCode,
                    json: async () => JSON.parse(body.toString('utf8')),
                    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
                });
            });
        });
        request.on('error', reject);
        if (options.body) request.write(options.body);
        request.end();
    });
}

const dom = new JSDOM();
globalThis.DOMParser = dom.window.DOMParser;
globalThis.XMLSerializer = dom.window.XMLSerializer;
globalThis.fetch = nodeFetch;

const { getSynBioHubProfile, queryCollectionMembers } = await import('../src/modules/metadataTemplates/synBioHubClient.js');
const { populateXlsm } = await import('../src/modules/metadataTemplates/xlsmPopulation.js');
const { unzipSync } = await import('fflate');

const profile = await getSynBioHubProfile({ apiUrl: API_URL, authToken: token });
if (profile.graphUri !== EXPECTED_GRAPH) console.warn(`Expected graph ${EXPECTED_GRAPH}; SynBioHub returned ${profile.graphUri}.`);
const rows = await queryCollectionMembers({ apiUrl: API_URL, authToken: token, userGraph: profile.graphUri, collectionUri: COLLECTION_URI, role: ROLE });
const templateResponse = await nodeFetch(TEMPLATE_URL);
if (!templateResponse.ok) throw new Error(`Template fetch failed (${templateResponse.status}).`);
const input = await templateResponse.arrayBuffer();
const output = populateXlsm(input, [{
    population: { sheetName: 'SBH_chassis_collections', tableName: 'SBH_chassis_collections', role: ROLE },
    rows,
}]);
const inputEntries = unzipSync(new Uint8Array(input));
const outputEntries = unzipSync(output.bytes);
const hash = (bytes) => bytes ? createHash('sha256').update(bytes).digest('hex') : null;
const changedParts = Object.keys(inputEntries).filter((name) => {
    const before = inputEntries[name]; const after = outputEntries[name];
    return !after || before.length !== after.length || before.some((value, index) => value !== after[index]);
}).sort();
const unexpectedChangedParts = changedParts.filter((name) => !output.changedParts.includes(name));
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'Strains-populated.xlsm'), output.bytes);
await writeFile(join(outputDirectory, 'integrity-report.json'), `${JSON.stringify({
    apiUrl: API_URL, collectionUri: COLLECTION_URI, graphUri: profile.graphUri, role: ROLE,
    resultCount: rows.length, populatedTable: 'SBH_chassis_collections',
    inputVbaHash: hash(inputEntries['xl/vbaProject.bin']), outputVbaHash: hash(outputEntries['xl/vbaProject.bin']),
    vbaHashesMatch: hash(inputEntries['xl/vbaProject.bin']) === hash(outputEntries['xl/vbaProject.bin']),
    changedPartNames: changedParts, unexpectedChangedPartNames: unexpectedChangedParts,
}, null, 2)}\n`);
console.log(`Populated ${rows.length} engineered-plasmid rows in ${outputDirectory}.`);
