"""GET /api/v1/{collection}: the collection's contents as JSON or SBOL."""
import pytest

from conftest import STUDY_URI, FakeResponse, auth_headers

URI = 'https://synbiohub.org/user/pmeka12/Test/part_a/1'


def sparql(*rows):
    return FakeResponse(200, json_data={'results': {'bindings': list(rows)}})


def row(uri=URI, display_id='part_a', **extra):
    binding = {'s': {'value': uri}, 'id': {'value': display_id}}
    binding.update({k: {'value': v} for k, v in extra.items()})
    return binding


@pytest.fixture
def study_exists(fake_sbh):
    fake_sbh.register('GET', '/metadata', FakeResponse(200, json_data={'name': 'Test'}))
    return fake_sbh


def get(client, path='devices', **kwargs):
    return client.get(f'/api/v1/{path}', headers=auth_headers(), **kwargs)


# --------------------------------------------------------------- the JSON shape

def test_items_carry_the_item_schema_fields(client, study_exists):
    study_exists.register('GET', '/sparql', sparql(row(
        name='Part A', description='a test part',
        type='http://www.biopax.org/release/biopax-level3.owl#DnaRegion',
        role='http://identifiers.org/so/SO:0000167',
    )))

    response = get(client)

    assert response.status_code == 200
    assert response.get_json() == [{
        'uri': URI,
        'displayId': 'part_a',
        'name': 'Part A',
        'description': 'a test part',
        'type': ['http://www.biopax.org/release/biopax-level3.owl#DnaRegion'],
        'role': ['http://identifiers.org/so/SO:0000167'],
    }]


def test_multivalued_roles_collapse_into_one_item(client, study_exists):
    """sbol:role is multi-valued, so SPARQL returns one row per role.

    Without grouping, a two-role object would appear twice in the array.
    """
    study_exists.register('GET', '/sparql', sparql(
        row(role='role_one'),
        row(role='role_two'),
    ))

    items = get(client).get_json()

    assert len(items) == 1
    assert items[0]['role'] == ['role_one', 'role_two']


def test_absent_optional_fields_are_null(client, study_exists):
    study_exists.register('GET', '/sparql', sparql(row()))

    item = get(client).get_json()[0]

    assert item['name'] is None and item['description'] is None
    assert item['type'] == [] and item['role'] == []


def test_several_members_are_all_returned(client, study_exists):
    study_exists.register('GET', '/sparql', sparql(
        row(uri=URI, display_id='part_a'),
        row(uri='https://synbiohub.org/user/pmeka12/Test/part_b/1', display_id='part_b'),
    ))

    assert [i['displayId'] for i in get(client).get_json()] == ['part_a', 'part_b']


# --------------------------------------------------------------- empty vs 404

def test_empty_collection_is_200_with_an_empty_array(client, study_exists):
    """A study with no such sub-collection yet is empty, not missing."""
    study_exists.register('GET', '/sparql', sparql())

    response = get(client)

    assert response.status_code == 200
    assert response.get_json() == []


def test_missing_study_is_404(client, fake_sbh):
    fake_sbh.register('GET', '/sparql', sparql())
    fake_sbh.register('GET', '/metadata', FakeResponse(404, text='Not found'))

    response = get(client)

    assert response.status_code == 404
    assert STUDY_URI in response.get_json()['error']


def test_empty_metadata_body_also_means_the_study_is_missing(client, fake_sbh):
    """SynBioHub answers 200 [] for a collection that does not exist.

    Verified against a live instance: /metadata does not 404 for a missing
    collection, so trusting the status code alone would report an empty
    collection on a study that is not there.
    """
    fake_sbh.register('GET', '/sparql', sparql())
    fake_sbh.register('GET', '/metadata', FakeResponse(200, json_data=[]))

    assert get(client).status_code == 404


def test_populated_metadata_means_the_study_exists(client, fake_sbh):
    fake_sbh.register('GET', '/sparql', sparql())
    fake_sbh.register('GET', '/metadata',
                      FakeResponse(200, json_data=[{'displayId': 'Test_collection'}]))

    response = get(client)

    assert response.status_code == 200
    assert response.get_json() == []


def test_a_populated_collection_never_checks_the_study(client, fake_sbh):
    """The common path costs one query, not two."""
    fake_sbh.register('GET', '/sparql', sparql(row()))

    assert get(client).status_code == 200
    assert fake_sbh.calls_matching('/metadata') == []


# ------------------------------------------------------------ content negotiation

def test_rdf_xml_streams_the_collection_sbol(client, fake_sbh):
    fake_sbh.register('GET', '/sbol', FakeResponse(200, content=b'<rdf:RDF/>'))

    response = client.get('/api/v1/devices',
                          headers={**auth_headers(), 'Accept': 'application/rdf+xml'})

    assert response.status_code == 200
    assert response.mimetype == 'application/rdf+xml'
    assert response.data == b'<rdf:RDF/>'


def test_rdf_request_targets_the_subcollection_on_the_api_host(client, fake_sbh):
    fake_sbh.register('GET', '/sbol', FakeResponse(200, content=b'<rdf:RDF/>'))

    client.get('/api/v1/devices',
               headers={**auth_headers(), 'Accept': 'application/rdf+xml'})

    assert fake_sbh.calls_matching('/sbol')[0].url == (
        'https://api.synbiohub.org/user/pmeka12/Test/Devices/1/sbol'
    )


def test_rdf_for_an_empty_collection_is_a_parseable_empty_document(client, study_exists):
    """An absent sub-collection is empty, not an error -- but the body still has
    to be XML. A zero-byte 200 with an rdf+xml content type breaks every parser."""
    import xml.etree.ElementTree as ET

    study_exists.register('GET', '/sbol', FakeResponse(404))

    response = client.get('/api/v1/devices',
                          headers={**auth_headers(), 'Accept': 'application/rdf+xml'})

    assert response.status_code == 200
    assert response.mimetype == 'application/rdf+xml'
    assert response.data, 'empty collection must not return a zero-byte body'
    root = ET.fromstring(response.data)          # raises if it is not well-formed
    assert root.tag.endswith('RDF')
    assert list(root) == []


def test_rdf_for_a_missing_study_is_still_404(client, fake_sbh):
    """The empty-document fallback must not mask a study that does not exist."""
    fake_sbh.register('GET', '/sbol', FakeResponse(404))
    fake_sbh.register('GET', '/metadata', FakeResponse(404, text='Not found'))

    response = client.get('/api/v1/devices',
                          headers={**auth_headers(), 'Accept': 'application/rdf+xml'})

    assert response.status_code == 404


def test_accept_any_still_gets_json(client, study_exists):
    """curl sends */* by default; that must not mean RDF."""
    study_exists.register('GET', '/sparql', sparql(row()))

    response = client.get('/api/v1/devices',
                          headers={**auth_headers(), 'Accept': '*/*'})

    assert response.mimetype == 'application/json'


# ------------------------------------------------------------------ failure modes

def test_get_requires_credentials(client):
    response = client.get('/api/v1/devices',
                          headers={'X-Study-Collection': STUDY_URI})

    assert response.status_code == 401


def test_synbiohub_failure_is_502(client, fake_sbh):
    fake_sbh.register('GET', '/sparql', FakeResponse(500, text='boom'))

    assert get(client).status_code == 502
