/**
 * Helper function to perform SPARQL queries to fetch URIs from SynBioHub
 */
export async function sbhGetSubCollectionUris(sbhUrl, sbhToken, usergraph, collectionUri, role = null) {
    let query;
    if (role === null) {
        query = `PREFIX sbol: <http://sbols.org/v2#> PREFIX dcterms: <http://purl.org/dc/terms/> SELECT ?name ?s FROM <${usergraph}> WHERE { <${collectionUri}> sbol:member ?s . OPTIONAL { ?s dcterms:title ?name } }`;
    } else {
        query = `PREFIX sbol: <http://sbols.org/v2#> PREFIX dcterms: <http://purl.org/dc/terms/> SELECT ?name ?s FROM <${usergraph}> WHERE { ?s sbol:role <${role}> . <${collectionUri}> sbol:member ?s . OPTIONAL { ?s dcterms:title ?name } }`;
    }

    const url = `${sbhUrl}/sparql?${new URLSearchParams({ query })}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-authorization': sbhToken
        }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`SynBioHub sparql query failed (${response.status}): ${text}`);
    }

    return response.json();
}

/**
 * Helper function to perform SPARQL queries to fetch just URIs from SynBioHub
 */
export async function sbhGetSubCollectionJustUri(sbhUrl, sbhToken, usergraph, collectionUri, role = null) {
    let query;
    if (role === null) {
        query = `PREFIX sbol: <http://sbols.org/v2#> SELECT ?s FROM <${usergraph}> WHERE { <${collectionUri}> sbol:member ?s }`;
    } else {
        query = `PREFIX sbol: <http://sbols.org/v2#> SELECT ?s FROM <${usergraph}> WHERE { ?s sbol:role <${role}> . <${collectionUri}> sbol:member ?s }`;
    }

    const url = `${sbhUrl}/sparql?${new URLSearchParams({ query })}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-authorization': sbhToken
        }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`SynBioHub sparql query failed (${response.status}): ${text}`);
    }

    return response.json();
}

// query = `PREFIX sbol: <http://sbols.org/v2#> PREFIX dcterms: <http://purl.org/dc/terms/> SELECT ?s ?name FROM <${usergraph}> WHERE { <${collectionUri}> sbol:member ?s . OPTIONAL { ?s dcterms:title ?name } }`;