"""The three legacy routes nothing in the frontend calls, kept as they are."""
import io
import json

import pytest


def json_part(payload: bytes, filename='part.json'):
    return (io.BytesIO(payload), filename)


@pytest.mark.parametrize('url', ['/api/uploadAssembly', '/api/uploadTransformation'])
def test_the_unbuilt_uploads_answer_501(client, url):
    response = client.post(url)

    assert response.status_code == 501
    assert response.data == b'Not implemented yet'


def test_inspect_request_echoes_each_json_part(client):
    response = client.post(
        '/api/inspect_request',
        data={
            'Params': json_part(json.dumps({'sbh_overwrite': True}).encode()),
            'Other': json_part(b'[1, 2]'),
        },
        content_type='multipart/form-data',
    )

    assert response.status_code == 200
    assert response.get_json() == {
        'message': 'Request received successfully',
        'files': {'Params': {'sbh_overwrite': True}, 'Other': [1, 2]},
    }


def test_inspect_request_rejects_a_part_that_is_not_json(client):
    response = client.post(
        '/api/inspect_request',
        data={'Params': json_part(b'{not json')},
        content_type='multipart/form-data',
    )

    assert response.status_code == 400
    assert set(response.get_json()) == {'error'}
