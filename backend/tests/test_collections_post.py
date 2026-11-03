"""POST /api/v1/{collection}: upload SBOL or Excel into a study's sub-collection."""
import re
from urllib.parse import unquote

import pytest
import requests

from sbs_server.app.api.registry import COLLECTIONS

from conftest import (STUDY_URI, FakeResponse, auth_headers, capture_submitted,
                      existing_study, missing_study)

IMPLEMENTED = sorted(p for p, s in COLLECTIONS.items() if s.implemented)


@pytest.fixture
def synbiohub(fake_sbh):
    """A SynBioHub with an empty sub-collection that accepts submissions."""
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql',
                      FakeResponse(200, json_data={'results': {'bindings': []}}))
    fake_sbh.register('POST', '/submit',
                      FakeResponse(200, text='Successfully uploaded'))
    return fake_sbh


def post(client, path, sbol_file, filename='part.xml'):
    with open(sbol_file, 'rb') as handle:
        return client.post(
            f'/api/v1/{path}',
            headers=auth_headers(),
            data={'file': (handle, filename)},
            content_type='multipart/form-data',
        )


def submit_call(sbh):
    calls = sbh.calls_matching('/submit')
    assert len(calls) == 1, calls
    return calls[0]


@pytest.mark.parametrize('path', IMPLEMENTED)
def test_post_sbol_succeeds_for_every_collection(client, synbiohub, sbol_file, path):
    response = post(client, path, sbol_file)

    assert response.status_code == 201, response.get_json()
    assert response.get_json()['status'] == 'success'


def test_submit_targets_the_study_from_the_header(client, synbiohub, sbol_file):
    post(client, 'resources', sbol_file)

    assert submit_call(synbiohub).kwargs['data']['rootCollections'] == STUDY_URI


def test_submit_merges_and_overwrites_matching_uris(client, synbiohub, sbol_file):
    """POST is the only add-or-update verb for content, so overwrite_merge=3."""
    post(client, 'resources', sbol_file)

    assert submit_call(synbiohub).kwargs['data']['overwrite_merge'] == 3


def test_post_keeps_the_existing_members(client, fake_sbh, sbol_file, monkeypatch):
    """The submitted sub-collection re-lists what is already there.

    With overwrite_merge=3 SynBioHub replaces the sub-collection's member list
    with the submitted one, so a POST that listed only its own objects would
    unlink every existing member. PUT relies on exactly that; POST must not.
    """
    existing = 'https://synbiohub.org/user/pmeka12/Test/already_here/1'
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql', FakeResponse(200, json_data={
        'results': {'bindings': [{'s': {'value': existing},
                                  'id': {'value': 'already_here'}}]}}))
    fake_sbh.register('POST', '/submit',
                      FakeResponse(200, text='Successfully uploaded'))
    bodies = capture_submitted(fake_sbh, monkeypatch)

    response = post(client, 'devices', sbol_file)

    assert response.status_code == 201, response.get_json()
    listed = re.findall(r'<sbol:member rdf:resource="([^"]+)"', bodies[-1])
    assert sorted(listed) == sorted([existing, 'https://example.com/test_part/1'])


def test_submit_authenticates_with_the_bearer_token(client, synbiohub, sbol_file):
    post(client, 'devices', sbol_file)

    assert submit_call(synbiohub).headers['X-authorization'] == 'test-token'


@pytest.mark.parametrize('path', IMPLEMENTED)
def test_subcollection_uri_carries_the_collections_import_type(
    client, synbiohub, sbol_file, path
):
    post(client, path, sbol_file)

    import_type = COLLECTIONS[path].import_type
    sparql = unquote(synbiohub.calls_matching('/sparql')[0].url)
    assert f'https://synbiohub.org/user/pmeka12/Test/{import_type}/1' in sparql


def test_requests_go_to_the_api_host_not_the_study_host(client, synbiohub, sbol_file):
    post(client, 'resources', sbol_file)

    for call in synbiohub.calls:
        assert call.url.startswith('https://api.synbiohub.org/'), call.url


def test_missing_file_part_is_400(client, synbiohub):
    response = client.post('/api/v1/resources', headers=auth_headers(),
                           data={}, content_type='multipart/form-data')

    assert response.status_code == 400
    assert 'file' in response.get_json()['error']


def test_excel_into_an_sbol_only_collection_is_415(client, synbiohub, sbol_file):
    response = post(client, 'devices', sbol_file, filename='sheet.xlsx')

    assert response.status_code == 415


def test_synbiohub_failure_surfaces_as_502(client, fake_sbh, sbol_file):
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql',
                      FakeResponse(200, json_data={'results': {'bindings': []}}))
    fake_sbh.register('POST', '/submit', FakeResponse(500, text='boom'))

    response = post(client, 'resources', sbol_file)

    assert response.status_code == 502
    assert 'error' in response.get_json()


def synbiohub_whose_submit(fake_sbh, outcome):
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql',
                      FakeResponse(200, json_data={'results': {'bindings': []}}))
    fake_sbh.register('POST', '/submit', outcome)
    return fake_sbh


def test_a_submit_that_times_out_is_a_504_with_an_unknown_outcome(
    client, fake_sbh, sbol_file,
):
    """SynBioHub may still apply an upload it did not answer in time, so
    "rejected" was wrong; the caller needs to know a retry is safe (review M2)."""
    synbiohub_whose_submit(fake_sbh, requests.ReadTimeout('read timed out'))

    response = post(client, 'resources', sbol_file)

    assert response.status_code == 504
    error = response.get_json()['error']
    assert 'unknown' in error
    assert 'safe' in error
    assert 'rejected' not in error


def test_a_submit_that_cannot_connect_is_a_504_that_sent_nothing(
    client, fake_sbh, sbol_file,
):
    synbiohub_whose_submit(fake_sbh, requests.ConnectTimeout('connect timed out'))

    response = post(client, 'resources', sbol_file)

    assert response.status_code == 504
    error = response.get_json()['error']
    assert 'Nothing was submitted' in error
    assert 'safe' in error


def test_post_still_requires_credentials(client, sbol_file):
    with open(sbol_file, 'rb') as handle:
        response = client.post(
            '/api/v1/resources',
            headers={'X-Study-Collection': STUDY_URI},
            data={'file': (handle, 'part.xml')},
            content_type='multipart/form-data',
        )

    assert response.status_code == 401


def test_post_to_a_missing_study_is_404(client, fake_sbh, sbol_file):
    """Checked before the upload is converted or submitted.

    Without the check, SynBioHub rejects the submit and it surfaces as a 502.
    """
    fake_sbh.register('GET', '/metadata', missing_study())

    response = post(client, 'resources', sbol_file)

    assert response.status_code == 404
    assert STUDY_URI in response.get_json()['error']
    assert fake_sbh.calls_matching('/submit') == []


def test_the_reported_count_excludes_the_collection_wrapper(client, synbiohub, sbol_file):
    """upload_to_sbh adds the sub-collection object to the document.

    Counting after the submit reported one object too many, so the response
    disagreed with what a subsequent GET returned.
    """
    response = post(client, 'devices', sbol_file)

    assert response.get_json()['message'] == 'Uploaded 1 object(s) to /devices'
