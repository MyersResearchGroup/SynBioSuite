// test-sbh.mjs
import { sbhGetSubCollectionUris } from './FetchInfo.js';

const SBH_URL = 'https://api.synbiohub.org'; // or your test instance
const SBH_TOKEN = process.env.SBH_TOKEN; //79d6c774-dca3-430a-bc24-680a90501338
const USERGRAPH = 'https://synbiohub.org/user/ameenah';
const COLLECTION_URI = 'https://synbiohub.org/user/ameenah/synbiohub_api_test/synbiohub_api_test_collection/1';

// http://identifiers.org/so/SO:0000637
// HOW TO RUN: SBH_TOKEN='token' node test.mjs

async function runTest() {
    try {
        // console.log('Test 1: no role filter');
        // const result1 = await sbhGetSubCollectionUris(SBH_URL, SBH_TOKEN, USERGRAPH, COLLECTION_URI);
        // console.log(JSON.stringify(result1, null, 2));

        // print names

        // print URIs
        console.log('\nTest 2: with role filter');
        const ROLE = 'http://identifiers.org/so/SO:0000637'; // e.g. engineered plasmid
        const result2 = await sbhGetSubCollectionUris(SBH_URL, SBH_TOKEN, USERGRAPH, COLLECTION_URI, ROLE);
        console.log(JSON.stringify(result2, null, 2));

        // fetch name
        // fetch uri

    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

runTest();