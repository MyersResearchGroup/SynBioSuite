"""DELETE /api/v1/{collection}: empty a collection without destroying objects."""
import pytest

from conftest import (STUDY_URI, FakeResponse, auth_headers, existing_study,
                      missing_study)

MEMBERS = ['alpha', 'beta', 'gamma']


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
    return fake_sbh


def test_delete_returns_204_with_no_body(client, synbiohub):
    response = client.delete('/api/v1/devices', headers=auth_headers())

    assert response.status_code == 204
    assert response.data == b''


def test_every_member_is_unlinked(client, synbiohub):
    client.delete('/api/v1/devices', headers=auth_headers())

    calls = synbiohub.calls_matching('/removeMembership')
    assert len(calls) == len(MEMBERS)
    assert sorted(c.kwargs['data']['member'].rsplit('/', 2)[-2] for c in calls) == MEMBERS


def test_it_never_calls_the_destructive_remove_endpoint(client, synbiohub):
    """<uri>/remove deletes the object itself. DELETE must not use it."""
    client.delete('/api/v1/devices', headers=auth_headers())

    assert [c for c in synbiohub.calls if c.url.endswith('/remove')] == []


def test_removal_targets_the_collection_on_the_api_host(client, synbiohub):
    client.delete('/api/v1/devices', headers=auth_headers())

    assert synbiohub.calls_matching('/removeMembership')[0].url == (
        'https://api.synbiohub.org/user/pmeka12/Test/Devices/1/removeMembership'
    )


def test_empty_collection_is_still_204(client, fake_sbh):
    """An existing study whose collection is empty -- not a missing study."""
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql', FakeResponse(200, json_data=bindings([])))

    response = client.delete('/api/v1/devices', headers=auth_headers())

    assert response.status_code == 204
    assert fake_sbh.calls_matching('/removeMembership') == []


def test_a_failed_removal_surfaces_as_502(client, fake_sbh):
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql', FakeResponse(200, json_data=bindings(MEMBERS)))
    fake_sbh.register('POST', '/removeMembership', FakeResponse(403, text='denied'))

    response = client.delete('/api/v1/devices', headers=auth_headers())

    assert response.status_code == 502


def test_delete_still_requires_credentials(client):
    response = client.delete('/api/v1/devices',
                             headers={'X-Study-Collection': STUDY_URI})

    assert response.status_code == 401


def test_delete_on_a_missing_study_is_404_not_204(client, fake_sbh):
    """Without the check, DELETE finds nothing to unlink and reports success."""
    fake_sbh.register('GET', '/metadata', missing_study())

    response = client.delete('/api/v1/devices', headers=auth_headers())

    assert response.status_code == 404
    assert STUDY_URI in response.get_json()['error']
    assert fake_sbh.calls_matching('/removeMembership') == []
