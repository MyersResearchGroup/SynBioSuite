"""PUT /api/v1/{collection}: make the collection contain exactly the upload.

One SynBioHub submit whose sub-collection lists only the upload -- for a GET
export, the objects its own copy of the collection lists. With
overwrite_merge=3 SynBioHub replaces the existing sub-collection -- member list
included -- so nothing is cleared first and there is nothing to roll back. A
member count afterwards catches the one case SynBioHub reports as success
without replacing anything.
"""
import io
import re

import pytest
import requests
import sbol2

from conftest import (
    STUDY_URI, FakeResponse, auth_headers, capture_submitted, existing_study,
    missing_study,
)

MEMBERS = ['old_one', 'old_two']
UPLOADED = 'test_part'  # the one object in the sbol_file fixture

# Where SynBioHub keeps this study's objects: STUDY_URI minus its last two segments.
STUDY_NAMESPACE = 'https://synbiohub.org/user/pmeka12/Test'
# The Devices sub-collection that upload_to_sbh submits, before SynBioHub re-homes it.
SUBMITTED_DEVICES = 'https://example.com/Devices/1'


def synbiohub_uri(name):
    return f'{STUDY_NAMESPACE}/{name}/1'


def bindings(names):
    return {'results': {'bindings': [
        {'s': {'value': synbiohub_uri(n)}, 'id': {'value': n}}
        for n in names
    ]}}


def synbiohub_export(members, collection='Devices', others=(), new=()):
    """What GET <sub-collection>/sbol returns, as bytes.

    SynBioHub's own copy of the sub-collection, plus the objects it lists, all
    on SynBioHub URIs. `others` are in the export without being members --
    SynBioHub's export follows references. `new` are objects a user added to
    the file, on a homespace SynBioHub does not own.
    """
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
    doc = sbol2.Document()

    sbol2.setHomespace(STUDY_NAMESPACE)
    for name in (*members, *others):
        doc.addComponentDefinition(sbol2.ComponentDefinition(name))
    exported = sbol2.Collection(collection)
    exported.members = [synbiohub_uri(name) for name in members]
    doc.addCollection(exported)

    sbol2.setHomespace('https://example.com/')
    for name in new:
        doc.addComponentDefinition(sbol2.ComponentDefinition(name))
    return doc.writeString().encode()


def submitted_collections(body):
    """Each Collection in a submitted file, mapped to the set of its members."""
    return {
        about: set(re.findall(r'<sbol:member rdf:resource="([^"]+)"', content))
        for about, content in re.findall(
            r'<sbol:Collection rdf:about="([^"]+)">(.*?)</sbol:Collection>',
            body, re.S,
        )
    }


def register_put(fake_sbh, check=None, submit=None):
    """A study that exists. `check` answers the member query after the submit."""
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql',
                      check or FakeResponse(200, json_data=bindings([UPLOADED])))
    fake_sbh.register('POST', '/submit',
                      submit or FakeResponse(200, text='Successfully uploaded'))
    return fake_sbh


@pytest.fixture
def synbiohub(fake_sbh):
    return register_put(fake_sbh)


def put(client, path, sbol_file, filename='part.xml'):
    with open(sbol_file, 'rb') as handle:
        return put_bytes(client, path, handle.read(), filename)


def put_bytes(client, path, body, filename='devices.xml'):
    return client.put(
        f'/api/v1/{path}',
        headers=auth_headers(),
        data={'file': (io.BytesIO(body), filename)},
        content_type='multipart/form-data',
    )


def get_rdf(client, path='devices'):
    return client.get(
        f'/api/v1/{path}',
        headers={**auth_headers(), 'Accept': 'application/rdf+xml'},
    )


def test_put_is_a_single_submit(client, synbiohub, sbol_file):
    response = put(client, 'devices', sbol_file)

    assert response.status_code == 200, response.get_json()
    assert len(synbiohub.calls_matching('/submit')) == 1
    assert synbiohub.calls_matching('/removeMembership') == []

    order = [c.url for c in synbiohub.calls if '/submit' in c.url or '/sparql' in c.url]
    assert order[0].endswith('/submit'), 'queried members before submitting'
    assert len(order) == 2, 'expected one submit and one check afterwards'


def test_the_submitted_subcollection_lists_only_the_upload(
    client, fake_sbh, sbol_file, monkeypatch
):
    """Listing only the upload is what unlinks the previous members.

    POST re-lists the existing members so the overwrite keeps them; PUT must
    not, or the old members would survive the replace.
    """
    register_put(fake_sbh)
    bodies = capture_submitted(fake_sbh, monkeypatch)

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 200, response.get_json()
    listed = re.findall(r'<sbol:member rdf:resource="([^"]+)"', bodies[-1])
    assert listed == [f'https://example.com/{UPLOADED}/1']
    assert 'Devices' in bodies[-1], 'did not submit the sub-collection'


def test_put_merges_and_overwrites_into_the_study(client, synbiohub, sbol_file):
    put(client, 'devices', sbol_file)

    data = synbiohub.calls_matching('/submit')[0].kwargs['data']
    assert data['overwrite_merge'] == 3
    assert data['rootCollections'] == STUDY_URI


def test_a_failed_put_changes_nothing(client, fake_sbh, sbol_file):
    """Nothing is cleared before the submit, so a rejected one leaves it as it was."""
    register_put(fake_sbh, submit=FakeResponse(500, text='boom'))

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 502
    assert len(fake_sbh.calls_matching('/submit')) == 1
    assert fake_sbh.calls_matching('/removeMembership') == []


def test_a_put_whose_submit_times_out_is_a_504_and_is_not_checked(
    client, fake_sbh, sbol_file,
):
    """SynBioHub may still be applying it, so there is nothing to verify yet;
    a retried PUT submits the same list and checks then (review M2)."""
    register_put(fake_sbh, submit=requests.ReadTimeout('read timed out'))

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 504
    assert 'unknown' in response.get_json()['error']
    assert fake_sbh.calls_matching('/sparql') == [], 'checked an unknown outcome'


def test_put_reports_members_synbiohub_did_not_replace(client, fake_sbh, sbol_file):
    """SynBioHub only logs a failed replace and still answers 200.

    PrepareSubmissionJob.java:544-547 -- the old members then sit alongside the
    new one. The client must hear about it, and nothing is unlinked on its
    behalf: a retried PUT asks SynBioHub to replace them again.
    """
    register_put(fake_sbh, check=FakeResponse(
        200, json_data=bindings(MEMBERS + [UPLOADED])))

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 502
    error = response.get_json()['error']
    assert '2 member(s)' in error
    assert 'old_one' in error and 'old_two' in error
    assert UPLOADED not in error
    assert fake_sbh.calls_matching('/removeMembership') == []
    assert [c for c in fake_sbh.calls if c.url.endswith('/remove')] == []


def test_put_counts_leftover_members_that_have_no_display_id(client, fake_sbh, sbol_file):
    """The check counts sbol:member links, not objects that happen to have a displayId."""
    anonymous = {'s': {'value': 'https://synbiohub.org/user/pmeka12/Test/anon'}}
    listed = bindings([UPLOADED])
    listed['results']['bindings'].append(anonymous)
    register_put(fake_sbh, check=FakeResponse(200, json_data=listed))

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 502
    assert '1 member(s)' in response.get_json()['error']


def test_put_names_only_the_first_few_leftover_members(client, fake_sbh, sbol_file):
    leftovers = [f'old_{n}' for n in range(7)]
    register_put(fake_sbh, check=FakeResponse(
        200, json_data=bindings(leftovers + [UPLOADED])))

    response = put(client, 'devices', sbol_file)

    error = response.get_json()['error']
    assert '7 member(s)' in error
    assert 'old_4, ...' in error and 'old_5' not in error


def test_put_reports_an_unverifiable_result(client, fake_sbh, sbol_file):
    """The submit went through; only the check failed. Lead with that."""
    register_put(fake_sbh, check=FakeResponse(500, text='down'))

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 502
    error = response.get_json()['error']
    assert error.startswith('The upload to /devices was submitted')
    assert 'could not be verified' in error


def test_put_never_uses_the_destructive_remove_endpoint(client, synbiohub, sbol_file):
    put(client, 'devices', sbol_file)

    assert [c for c in synbiohub.calls if c.url.endswith('/remove')] == []


def test_a_bad_upload_submits_nothing(client, synbiohub, tmp_path):
    """Validation and conversion happen before anything reaches SynBioHub."""
    junk = tmp_path / 'junk.xml'
    junk.write_text('not SBOL at all')

    response = put(client, 'devices', str(junk))

    assert response.status_code == 400
    assert synbiohub.calls_matching('/submit') == []


def test_wrong_format_submits_nothing(client, synbiohub, sbol_file):
    response = put(client, 'devices', sbol_file, filename='book.xlsx')

    assert response.status_code == 415
    assert synbiohub.calls_matching('/submit') == []


def test_put_to_a_missing_study_is_404_and_changes_nothing(client, fake_sbh, sbol_file):
    """Checked before validation, and so before anything is submitted."""
    fake_sbh.register('GET', '/metadata', missing_study())

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 404
    assert fake_sbh.calls_matching('/removeMembership') == []
    assert fake_sbh.calls_matching('/submit') == []


def test_the_reported_count_excludes_the_collection_wrapper(client, synbiohub, sbol_file):
    """Same off-by-one as POST had: count before submitting, not after."""
    response = put(client, 'devices', sbol_file)

    assert response.get_json()['message'] == '/devices now contains 1 object(s)'


# ------------------------------------------------- a collection's own export

def test_put_of_the_collections_own_export_keeps_its_members(client, fake_sbh, monkeypatch):
    """GET (rdf+xml) then PUT the same file back: the collection is unchanged.

    Every object in the export already has a SynBioHub URI, and the export
    carries SynBioHub's own copy of the sub-collection. PUT used to list none
    of the objects, and to submit that copy next to its own empty one -- two
    collections that land on the same URI.
    """
    register_put(fake_sbh, check=FakeResponse(
        200, json_data=bindings(['part_a', 'part_b'])))
    fake_sbh.register('GET', '/sbol', FakeResponse(
        200, content=synbiohub_export(['part_a', 'part_b'])))
    bodies = capture_submitted(fake_sbh, monkeypatch)

    exported = get_rdf(client)
    assert exported.status_code == 200
    response = put_bytes(client, 'devices', exported.data)

    assert response.status_code == 200, response.get_json()
    assert submitted_collections(bodies[-1]) == {
        SUBMITTED_DEVICES: {synbiohub_uri('part_a'), synbiohub_uri('part_b')},
    }
    assert response.get_json()['message'] == '/devices now contains 2 object(s)'


def test_put_of_an_export_lists_its_members_and_new_objects_only(
    client, fake_sbh, monkeypatch
):
    """An edited export: what its collection listed, plus what the user added.

    sub_part is in the export only because SynBioHub's export follows
    references; it was never a member, so the PUT must not make it one.
    """
    register_put(fake_sbh, check=FakeResponse(
        200, json_data=bindings(['part_a', 'new_part'])))
    bodies = capture_submitted(fake_sbh, monkeypatch)
    body = synbiohub_export(['part_a'], others=['sub_part'], new=['new_part'])

    response = put_bytes(client, 'devices', body)

    assert response.status_code == 200, response.get_json()
    assert submitted_collections(bodies[-1]) == {
        SUBMITTED_DEVICES: {synbiohub_uri('part_a'), 'https://example.com/new_part/1'},
    }
    assert response.get_json()['message'] == '/devices now contains 2 object(s)'


@pytest.mark.parametrize('body', [
    pytest.param(lambda: synbiohub_export([]), id='export-of-an-empty-collection'),
    pytest.param(lambda: synbiohub_export(['design_a'], collection='Designs'),
                 id='export-of-another-collection'),
])
def test_put_that_would_leave_the_collection_empty_is_400(client, synbiohub, body):
    """Nothing in the upload would be listed, so the PUT would only empty it.

    DELETE is the verb for that. Refused before anything reaches SynBioHub.
    """
    response = put_bytes(client, 'devices', body())

    assert response.status_code == 400, response.get_json()
    assert '/devices' in response.get_json()['error']
    assert synbiohub.calls_matching('/submit') == []


def test_put_reports_listed_objects_synbiohub_did_not_link(client, fake_sbh, sbol_file):
    """The submit answered 200, but the collection does not list the upload.

    Without this check an emptied collection was reported as a success.
    """
    register_put(fake_sbh, check=FakeResponse(200, json_data=bindings([])))

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 502
    assert UPLOADED in response.get_json()['error']
    assert fake_sbh.calls_matching('/removeMembership') == []
