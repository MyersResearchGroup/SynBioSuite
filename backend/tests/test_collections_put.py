"""PUT /api/v1/{collection}: make the collection contain exactly the upload.

One SynBioHub submit whose sub-collection lists only the upload. With
overwrite_merge=3 SynBioHub replaces the existing sub-collection -- member list
included -- so nothing is cleared first and there is nothing to roll back. A
member count afterwards catches the one case SynBioHub reports as success
without replacing anything.
"""
import re

import pytest

from conftest import (
    STUDY_URI, FakeResponse, auth_headers, capture_submitted, existing_study,
    missing_study,
)

MEMBERS = ['old_one', 'old_two']
UPLOADED = 'test_part'  # the one object in the sbol_file fixture


def bindings(names):
    return {'results': {'bindings': [
        {'s': {'value': f'https://synbiohub.org/user/pmeka12/Test/{n}/1'},
         'id': {'value': n}}
        for n in names
    ]}}


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
    return client.put(
        f'/api/v1/{path}',
        headers=auth_headers(),
        data={'file': (open(sbol_file, 'rb'), filename)},
        content_type='multipart/form-data',
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
