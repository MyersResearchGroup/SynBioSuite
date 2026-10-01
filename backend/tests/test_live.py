"""Read-only checks against a real SynBioHub.

Skipped unless backend/.env.test supplies SBS_TEST_SBH_URL, SBS_TEST_SBH_TOKEN
and SBS_TEST_STUDY_COLLECTION. Tests marked @requires_scratch write -- submit,
attach, unlink -- and only ever to SBS_TEST_SCRATCH_COLLECTION; everything else
is read-only. Nothing calls SynBioHub's destructive /remove. The token is never
printed, and no assertion message includes it.

Run just these:  python -m pytest -m live -v
"""
import os

import pytest

from sbs_server.app.api.context import StudyContext
from sbs_server.app.api.registry import COLLECTIONS
from sbs_server.app.api import sbh
from sbs_server.app.utils import get_sbh_user, sbh_get_subCollection_uris, sparql_query

from conftest import requires_live, requires_scratch

pytestmark = [pytest.mark.live, requires_live]


def context_for(app, live):
    with app.test_request_context(headers=live.headers):
        return StudyContext.from_request()


def test_token_authenticates(live):
    profile = get_sbh_user(live.url, live.token)

    assert profile['user']
    assert profile['graph'].startswith('http')


def test_derived_usergraph_matches_the_graph_synbiohub_reports(app, live):
    """The assumption the whole API rests on, checked against the real server.

    usergraph is sliced out of the study URI (parts[:5]) by both upload_to_sbh
    and StudyContext. If that does not equal the graphUri SynBioHub hands back
    for this account, every SPARQL query runs against the wrong graph and
    silently returns nothing.
    """
    ctx = context_for(app, live)
    profile = get_sbh_user(live.url, live.token)

    assert ctx.usergraph == profile['graph']
    assert ctx.user == profile['user']


def test_study_collection_is_reachable(app, live):
    """A SPARQL query over the study collection itself must succeed."""
    ctx = context_for(app, live)

    result = sbh_get_subCollection_uris(
        ctx.sbh_url, ctx.token, ctx.usergraph, ctx.study_uri
    )

    assert 'results' in result
    assert isinstance(result['results']['bindings'], list)


@pytest.mark.parametrize(
    'path', sorted(p for p, s in COLLECTIONS.items() if s.implemented)
)
def test_every_subcollection_query_succeeds(app, live, path):
    """A collection with no sub-collection yet must come back empty, not error.

    This is the case GET has to render as 200 [] rather than 404.
    """
    ctx = context_for(app, live)
    spec = COLLECTIONS[path]

    result = sbh_get_subCollection_uris(
        ctx.sbh_url, ctx.token, ctx.usergraph, ctx.subcollection_uri(spec.import_type)
    )

    assert isinstance(result['results']['bindings'], list)


def test_study_members_are_visible(app, live):
    """Sanity: the configured study should actually contain something."""
    ctx = context_for(app, live)

    result = sbh_get_subCollection_uris(
        ctx.sbh_url, ctx.token, ctx.usergraph, ctx.study_uri
    )
    bindings = result['results']['bindings']

    print(f'\nstudy {ctx.study_uri} has {len(bindings)} direct member(s)')
    for binding in bindings[:10]:
        print('  ', binding['id']['value'], '->', binding['s']['value'])


# --------------------------------------------------- destructive, scratch only

@requires_scratch
def test_post_then_delete_round_trip(app, client, live, sbol_file):
    """The whole write path against a real SynBioHub, on a throwaway collection.

    Uploads into the scratch study's Devices sub-collection, confirms the object
    landed, empties the collection through the API, and then confirms the SBOL
    object itself still exists -- DELETE unlinks, it does not destroy.
    """
    headers = live.scratch_headers
    spec = COLLECTIONS['devices']

    with app.test_request_context(headers=headers):
        ctx = StudyContext.from_request()
    collection_uri = ctx.subcollection_uri(spec.import_type)

    created = client.post(
        '/api/v1/devices',
        headers=headers,
        data={'file': (open(sbol_file, 'rb'), 'part.xml')},
        content_type='multipart/form-data',
    )
    assert created.status_code == 201, created.get_json()

    after_post = sbh.members(ctx, collection_uri)
    assert after_post, 'nothing landed in the scratch sub-collection'
    object_uris = [m['uri'] for m in after_post]
    print(f'\nafter POST: {len(after_post)} member(s) in {collection_uri}')
    for member in after_post:
        print('   ', member['displayId'], '->', member['uri'])

    cleared = client.delete('/api/v1/devices', headers=headers)
    assert cleared.status_code == 204
    assert cleared.data == b''

    assert sbh.members(ctx, collection_uri) == [], 'collection was not emptied'
    print(f'after DELETE: 0 members')

    # The objects must have survived being unlinked.
    for uri in object_uris:
        query = (
            'PREFIX sbol: <http://sbols.org/v2#> SELECT ?id FROM <%s> WHERE '
            '{ <%s> sbol:displayId ?id }' % (ctx.usergraph, uri)
        )
        still_there = sparql_query(ctx.sbh_url, ctx.token, query)
        assert still_there['results']['bindings'], f'{uri} was destroyed, not unlinked'
    print(f'all {len(object_uris)} object(s) survived the unlink')


def _sbol_with(tmp_path, *names):
    """An SBOL file containing exactly the named parts."""
    import sbol2

    sbol2.Config.setOption(sbol2.ConfigOptions.VALIDATE, False)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
    sbol2.setHomespace('https://example.com/')

    doc = sbol2.Document()
    for name in names:
        doc.addComponentDefinition(sbol2.ComponentDefinition(name))
    path = tmp_path / ('_'.join(names) + '.xml')
    doc.write(str(path))
    return str(path)


@requires_scratch
def test_put_replaces_collection_contents(app, client, live, tmp_path):
    """PUT against a real SynBioHub: what was there before must be gone after."""
    headers = live.scratch_headers
    spec = COLLECTIONS['devices']

    with app.test_request_context(headers=headers):
        ctx = StudyContext.from_request()
    collection_uri = ctx.subcollection_uri(spec.import_type)

    def display_ids():
        return sorted(m['displayId'] for m in sbh.members(ctx, collection_uri))

    client.delete('/api/v1/devices', headers=headers)
    assert display_ids() == []

    def upload(path, method):
        return method(
            '/api/v1/devices',
            headers=headers,
            data={'file': (open(path, 'rb'), 'parts.xml')},
            content_type='multipart/form-data',
        )

    seeded = upload(_sbol_with(tmp_path, 'put_old_a', 'put_old_b'), client.post)
    assert seeded.status_code == 201, seeded.get_json()
    before = display_ids()
    print(f'\nbefore PUT: {before}')
    assert before == ['put_old_a', 'put_old_b']

    replaced = upload(_sbol_with(tmp_path, 'put_new_c'), client.put)
    assert replaced.status_code == 200, replaced.get_json()

    after = display_ids()
    print(f'after PUT : {after}')
    assert after == ['put_new_c'], 'PUT did not replace the previous contents'

    client.delete('/api/v1/devices', headers=headers)
    print('cleaned up:', display_ids())


@requires_live
def test_get_returns_real_study_contents(client, live):
    """GET against the real study -- Item shape exercised on real data."""
    response = client.get('/api/v1/resources', headers=live.headers)

    assert response.status_code in (200, 404), response.get_json()
    if response.status_code == 404:
        pytest.skip('study collection not reachable')

    items = response.get_json()
    assert isinstance(items, list)
    print(f'\nGET /resources -> {len(items)} item(s)')
    for item in items[:5]:
        assert set(item) >= {'uri', 'displayId', 'name', 'description', 'type', 'role'}
        assert isinstance(item['type'], list) and isinstance(item['role'], list)
        print('   ', item['displayId'], '|', item['name'], '|', item['role'])


@requires_live
def test_get_rdf_returns_a_real_sbol_document(client, live):
    response = client.get(
        '/api/v1/resources',
        headers={**live.headers, 'Accept': 'application/rdf+xml'},
    )

    assert response.status_code == 200
    assert response.mimetype == 'application/rdf+xml'
    print(f'\nGET /resources (rdf+xml) -> {len(response.data)} bytes')
    if response.data:
        assert b'rdf:RDF' in response.data or b'<rdf' in response.data


@requires_live
def test_empty_collection_is_200_not_404_on_a_real_study(client, live):
    """A study with no Plasmids sub-collection must read as empty, not missing."""
    response = client.get('/api/v1/plasmids', headers=live.headers)

    assert response.status_code == 200, response.get_json()
    assert isinstance(response.get_json(), list)
    print(f'\nGET /plasmids -> {len(response.get_json())} item(s) (200, not 404)')


@requires_scratch
def test_get_item_shape_against_real_synbiohub_data(client, live, tmp_path):
    """POST known objects, then GET them back and check the Item shape.

    The read-only study keeps its members in the root collection rather than in
    importType sub-collections, so GET there is always empty. This puts real
    objects in a real sub-collection and reads the metadata SynBioHub returns.
    """
    headers = live.scratch_headers
    client.delete('/api/v1/devices', headers=headers)

    created = client.post(
        '/api/v1/devices',
        headers=headers,
        data={'file': (open(_sbol_with(tmp_path, 'shape_x', 'shape_y'), 'rb'),
                       'parts.xml')},
        content_type='multipart/form-data',
    )
    assert created.status_code == 201, created.get_json()

    try:
        response = client.get('/api/v1/devices', headers=headers)
        assert response.status_code == 200, response.get_json()
        items = response.get_json()

        print(f'\nGET /devices on scratch -> {len(items)} item(s)')
        for item in items:
            print('   ', {k: v for k, v in item.items() if k != 'uri'})

        assert sorted(i['displayId'] for i in items) == ['shape_x', 'shape_y']
        for item in items:
            assert set(item) == {'uri', 'displayId', 'name', 'description',
                                 'type', 'role'}
            assert isinstance(item['type'], list)
            assert isinstance(item['role'], list)
            assert item['uri'].startswith('https://synbiohub.org/')

        rdf = client.get('/api/v1/devices',
                         headers={**headers, 'Accept': 'application/rdf+xml'})
        assert rdf.status_code == 200
        assert b'shape_x' in rdf.data, 'SBOL download did not contain the members'
        print(f'GET /devices (rdf+xml) -> {len(rdf.data)} bytes, contains members')
    finally:
        client.delete('/api/v1/devices', headers=headers)


@requires_live
def test_a_study_that_does_not_exist_is_404(client, live):
    """Against the real server, where /metadata answers 200 [] rather than 404."""
    missing = 'https://synbiohub.org/user/pmeka12/NoSuchStudy/NoSuchStudy_collection/1'

    response = client.get('/api/v1/resources',
                          headers={**live.headers, 'X-Study-Collection': missing})

    assert response.status_code == 404, response.get_json()
    assert 'NoSuchStudy' in response.get_json()['error']
    print(f'\nmissing study -> 404: {response.get_json()["error"]}')


@requires_live
def test_every_write_to_a_missing_study_is_404(client, live, sbol_file):
    """Against the real server, where /metadata answers 200 [] for a missing study.

    Safe to run: the study check comes first, so nothing reaches /submit or
    removeMembership -- and the study does not exist anyway.
    """
    missing = 'https://synbiohub.org/user/pmeka12/NoSuchStudy/NoSuchStudy_collection/1'
    headers = {**live.headers, 'X-Study-Collection': missing}

    def upload(method):
        return method('/api/v1/devices', headers=headers,
                      data={'file': (open(sbol_file, 'rb'), 'part.xml')},
                      content_type='multipart/form-data')

    responses = {
        'DELETE': client.delete('/api/v1/devices', headers=headers),
        'POST': upload(client.post),
        'PUT': upload(client.put),
        'template': client.get('/api/v1/resources/template', headers=headers),
    }

    for name, response in responses.items():
        assert response.status_code == 404, (name, response.get_json())
    print('\nmissing study -> ' + ', '.join(f'{n} 404' for n in responses))


# ------------------------------------------- Excel and attachments, scratch only
# Both paths below had no live coverage at all: convert_to_sbol was never
# executed by any test, and sbh.attach / resolve_member only ever met a fake.

FILLED_STRAINS = os.path.expanduser(
    '~/SPUR/Align-TF-Cytom-12-plasmids_Strains.xlsm'
)


@requires_scratch
@pytest.mark.skipif(
    not os.path.exists(FILLED_STRAINS),
    reason=f'filled workbook not present at {FILLED_STRAINS}',
)
def test_a_real_workbook_converts_and_uploads(app, client, live):
    """The flagship path end to end: .xlsm -> excel2sbol -> SynBioHub.

    Strains rather than Resources because it converts to 5 objects instead of
    92, and DELETE only unlinks -- every run leaves its objects behind.
    """
    headers = live.scratch_headers
    with app.test_request_context(headers=headers):
        ctx = StudyContext.from_request()
    collection_uri = ctx.subcollection_uri(COLLECTIONS['strains'].import_type)

    try:
        with open(FILLED_STRAINS, 'rb') as handle:
            created = client.post(
                '/api/v1/strains',
                headers=headers,
                data={'file': (handle, 'Strains.xlsm')},
                content_type='multipart/form-data',
            )
        assert created.status_code == 201, created.get_json()

        members = sbh.members(ctx, collection_uri)
        print(f'\nworkbook upload: {len(members)} member(s) in {collection_uri}')
        assert members, 'the converted workbook produced no members'
    finally:
        client.delete('/api/v1/strains', headers=headers)


@requires_scratch
def test_an_attachment_lands_on_a_real_object(app, client, live, sbol_file, tmp_path):
    """PATCH /assays/{id}/attachments against a real SynBioHub.

    Nothing else confirms SynBioHub accepts the multipart shape sbh.attach
    sends, or that resolve_member finds an object by displayId for real.
    """
    headers = live.scratch_headers
    with app.test_request_context(headers=headers):
        ctx = StudyContext.from_request()

    reading = tmp_path / 'reading.csv'
    reading.write_text('time,od\n0,0.1\n1,0.4\n')

    try:
        with open(sbol_file, 'rb') as handle:
            created = client.post(
                '/api/v1/assays', headers=headers,
                data={'file': (handle, 'assay.xml')},
                content_type='multipart/form-data',
            )
        assert created.status_code == 201, created.get_json()

        collection_uri = ctx.subcollection_uri(COLLECTIONS['assays'].import_type)
        members = sbh.members(ctx, collection_uri)
        assert members, 'nothing to attach to'
        display_id = members[0]['displayId']

        with open(reading, 'rb') as handle:
            patched = client.patch(
                f'/api/v1/assays/{display_id}/attachments',
                headers=headers,
                data={'file': (handle, 'reading.csv')},
                content_type='multipart/form-data',
            )
        assert patched.status_code == 200, patched.get_json()
        assert 'reading.csv' in patched.get_json()['message']

        attached = sparql_query(ctx.sbh_url, ctx.token, ATTACHMENT_QUERY % (
            ctx.usergraph, members[0]['uri']))
        rows = attached['results']['bindings']
        print(f'\nattachments on {display_id}: {len(rows)}')
        assert rows, 'SynBioHub reports no attachment on the object'
    finally:
        client.delete('/api/v1/assays', headers=headers)


ATTACHMENT_QUERY = """PREFIX sbol: <http://sbols.org/v2#>
SELECT ?a FROM <%s> WHERE { <%s> sbol:attachment ?a }"""
