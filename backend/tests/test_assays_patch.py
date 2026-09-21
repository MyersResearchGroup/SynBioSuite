"""PATCH /api/v1/assays/{id}: attach a file to one SBOL object.

The only per-item route in the API, per the resource map:
"PATCH/ID (Adding a new attachment to the pointed SBOL object)",
served at /assays/{id}/attachments.
"""
import pytest

from conftest import FakeResponse, auth_headers

OBJECT_URI = 'https://synbiohub.org/user/pmeka12/Test/my_assay/1'


@pytest.fixture
def synbiohub(fake_sbh):
    fake_sbh.register('GET', '/sparql', FakeResponse(200, json_data={
        'results': {'bindings': [
            {'s': {'value': OBJECT_URI}, 'id': {'value': 'my_assay'}},
        ]}
    }))
    fake_sbh.register('POST', '/attach', FakeResponse(200, text='ok'))
    return fake_sbh


def patch(client, object_id, tmp_path, name='reading.csv'):
    attachment = tmp_path / name
    attachment.write_text('well,value\nA1,0.5\n')
    return client.patch(
        f'/api/v1/assays/{object_id}/attachments',
        headers=auth_headers(),
        data={'file': (open(attachment, 'rb'), name)},
        content_type='multipart/form-data',
    )


def test_attaches_to_the_resolved_object(client, synbiohub, tmp_path):
    response = patch(client, 'my_assay', tmp_path)

    assert response.status_code == 200, response.get_json()
    assert response.get_json()['status'] == 'success'


def test_attach_targets_the_object_uri_on_the_api_host(client, synbiohub, tmp_path):
    patch(client, 'my_assay', tmp_path)

    calls = synbiohub.calls_matching('/attach')
    assert len(calls) == 1
    assert calls[0].url == (
        'https://api.synbiohub.org/user/pmeka12/Test/my_assay/1/attach'
    )


def test_attachment_file_is_sent(client, synbiohub, tmp_path):
    patch(client, 'my_assay', tmp_path)

    files = synbiohub.calls_matching('/attach')[0].kwargs['files']
    assert files['file'][0] == 'reading.csv'


def test_the_full_uri_also_resolves(client, synbiohub, tmp_path):
    assert patch(client, OBJECT_URI.rsplit('/', 2)[-2], tmp_path).status_code == 200


def test_unknown_object_is_404(client, synbiohub, tmp_path):
    response = patch(client, 'not_here', tmp_path)

    assert response.status_code == 404
    assert 'not_here' in response.get_json()['error']
    assert synbiohub.calls_matching('/attach') == []


def test_missing_file_part_is_400(client, synbiohub):
    response = client.patch('/api/v1/assays/my_assay/attachments', headers=auth_headers(),
                            data={}, content_type='multipart/form-data')

    assert response.status_code == 400


def test_attach_failure_surfaces_as_502(client, fake_sbh, tmp_path):
    fake_sbh.register('GET', '/sparql', FakeResponse(200, json_data={
        'results': {'bindings': [
            {'s': {'value': OBJECT_URI}, 'id': {'value': 'my_assay'}},
        ]}
    }))
    fake_sbh.register('POST', '/attach', FakeResponse(403, text='denied'))

    assert patch(client, 'my_assay', tmp_path).status_code == 502
