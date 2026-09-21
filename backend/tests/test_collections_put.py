"""PUT /api/v1/{collection}: make the collection contain exactly the upload.

SynBioHub has no atomic replace -- overwrite_merge=1 is rejected when
rootCollections is set -- so PUT clears then submits. These tests pin the two
properties that make that safe: bad input never clears, and a failed submit
restores the previous membership.
"""
import pytest
import requests

from conftest import (
    STUDY_URI, FakeResponse, auth_headers, existing_study, missing_study,
)

MEMBERS = ['old_one', 'old_two']


def bindings(names):
    return {'results': {'bindings': [
        {'s': {'value': f'https://synbiohub.org/user/pmeka12/Test/{n}/1'},
         'id': {'value': n}}
        for n in names
    ]}}


@pytest.fixture
def synbiohub(fake_sbh):
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql', FakeResponse(200, json_data=bindings(MEMBERS)))
    fake_sbh.register('POST', '/removeMembership', FakeResponse(200, text='Success'))
    fake_sbh.register('POST', '/submit', FakeResponse(200, text='Successfully uploaded'))
    return fake_sbh


def put(client, path, sbol_file, filename='part.xml'):
    return client.put(
        f'/api/v1/{path}',
        headers=auth_headers(),
        data={'file': (open(sbol_file, 'rb'), filename)},
        content_type='multipart/form-data',
    )


def test_put_clears_then_submits(client, synbiohub, sbol_file):
    response = put(client, 'devices', sbol_file)

    assert response.status_code == 200, response.get_json()
    assert len(synbiohub.calls_matching('/removeMembership')) == len(MEMBERS)
    assert len(synbiohub.calls_matching('/submit')) == 1

    order = [c.url for c in synbiohub.calls if 'removeMembership' in c.url
             or '/submit' in c.url]
    assert 'removeMembership' in order[0], 'submitted before clearing'
    assert order[-1].endswith('/submit')


def test_put_never_uses_the_destructive_remove_endpoint(client, synbiohub, sbol_file):
    put(client, 'devices', sbol_file)

    assert [c for c in synbiohub.calls if c.url.endswith('/remove')] == []


def test_a_bad_upload_does_not_clear_the_collection(client, synbiohub, tmp_path):
    """The property that makes clear-then-submit acceptable.

    Validation and conversion happen before anything is removed, so a garbage
    file cannot empty a collection.
    """
    junk = tmp_path / 'junk.xml'
    junk.write_text('not SBOL at all')

    response = put(client, 'devices', str(junk))

    assert response.status_code == 400
    assert synbiohub.calls_matching('/removeMembership') == []
    assert synbiohub.calls_matching('/submit') == []


def test_wrong_format_does_not_clear_the_collection(client, synbiohub, sbol_file):
    response = put(client, 'devices', sbol_file, filename='book.xlsx')

    assert response.status_code == 415
    assert synbiohub.calls_matching('/removeMembership') == []


def test_a_failed_submit_restores_the_previous_membership(
    client, fake_sbh, sbol_file, monkeypatch
):
    """Clear succeeded, submit failed -- the collection must not be left empty.

    Asserts the *content* of the restore, not just that one happened: a rollback
    that re-linked nothing, or the wrong URIs, would otherwise pass.
    """
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql', FakeResponse(200, json_data=bindings(MEMBERS)))
    fake_sbh.register('POST', '/removeMembership', FakeResponse(200, text='Success'))
    fake_sbh.register('POST', '/submit', [
        FakeResponse(500, text='boom'),                  # the real submit
        FakeResponse(200, text='Successfully uploaded'), # the restore
    ])

    # restore_members deletes its temp file the moment it returns, so the
    # uploaded bytes have to be read while the call is still in flight.
    bodies = []
    forward = fake_sbh.post

    def capture(url, **kwargs):
        handle = (kwargs.get('files') or {}).get('files')
        if hasattr(handle, 'read'):
            here = handle.tell()
            bodies.append(handle.read())
            handle.seek(here)
        return forward(url, **kwargs)

    monkeypatch.setattr(requests, 'post', capture)

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 502
    submits = fake_sbh.calls_matching('/submit')
    assert len(submits) == 2, 'no restore was attempted'
    assert submits[1].kwargs['data']['overwrite_merge'] == 3
    assert submits[1].kwargs['data']['rootCollections'] == STUDY_URI

    restored = bodies[-1].decode('utf-8')
    for name in MEMBERS:
        assert name in restored, f'{name} was not re-linked by the rollback'
    assert 'Devices' in restored, 'restore did not name the sub-collection'


def test_nothing_to_restore_when_the_collection_was_empty(client, fake_sbh, sbol_file):
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql', FakeResponse(200, json_data=bindings([])))
    fake_sbh.register('POST', '/submit', FakeResponse(500, text='boom'))

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 502
    assert len(fake_sbh.calls_matching('/submit')) == 1


def test_put_to_a_missing_study_is_404_and_clears_nothing(client, fake_sbh, sbol_file):
    """Checked before validation, and so before anything is cleared."""
    fake_sbh.register('GET', '/metadata', missing_study())

    response = put(client, 'devices', sbol_file)

    assert response.status_code == 404
    assert fake_sbh.calls_matching('/removeMembership') == []
    assert fake_sbh.calls_matching('/submit') == []


def test_the_reported_count_excludes_the_collection_wrapper(client, synbiohub, sbol_file):
    """Same off-by-one as POST had: count before submitting, not after."""
    response = put(client, 'devices', sbol_file)

    assert response.get_json()['message'] == '/devices now contains 1 object(s)'
