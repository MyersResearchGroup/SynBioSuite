"""Review H5 through the routes: no caller-chosen URL reaches an internal host.

/api/v1 takes the SynBioHub base from X-SynBioHub-Url (or derives it from the
study URI); the legacy routes take it from the sbh_url param. Both now go
through sbh_http, which refuses a non-public destination before sending a byte.
"""
import io
import json

import pytest
import sbol2

from sbs_server.app import sbh_http
from sbs_server.app.api import sbh
from sbs_server.app.api.context import SBH_URL_HEADER, StudyContext
from sbs_server.app.api.registry import COLLECTIONS
from sbs_server.app.sbh_http import BlockedDestinationError
from sbs_server.app.synbiohubUpload import upload_sbh_attachments

from conftest import STUDY_URI, TOKEN, FakeResponse, auth_headers

REVIEW_REPRO = 'http://169.254.169.254/latest/meta-data?x='


# --------------------------------------------------------------- /api/v1

@pytest.mark.parametrize('method, accept', [
    ('get', 'application/json'),     # list_items is the first call
    ('get', 'application/rdf+xml'),  # fetch_collection_sbol is the first call
    ('delete', 'application/json'),  # study_exists is the first call
])
def test_v1_refuses_a_loopback_synbiohub_before_sending_anything(
    client, real_sbh_http, listener, method, accept,
):
    headers = auth_headers(**{SBH_URL_HEADER: listener.url, 'Accept': accept})

    response = getattr(client, method)('/api/v1/devices', headers=headers)

    assert response.status_code == 400
    assert 'non-public' in response.get_json()['error']
    assert listener.received() == b''


@pytest.mark.parametrize('method', ['post', 'put'])
def test_v1_writes_refuse_a_loopback_synbiohub(
    client, real_sbh_http, listener, sbol_file, method,
):
    response = getattr(client, method)(
        '/api/v1/devices',
        headers=auth_headers(**{SBH_URL_HEADER: listener.url}),
        data={'file': (open(sbol_file, 'rb'), 'part.xml')},
        content_type='multipart/form-data',
    )

    assert response.status_code == 400
    assert listener.received() == b''


def test_v1_rejects_the_review_reproduction(client, fake_sbh):
    response = client.get(
        '/api/v1/devices', headers=auth_headers(**{SBH_URL_HEADER: REVIEW_REPRO}),
    )

    assert response.status_code == 400
    assert fake_sbh.calls == []


# ---------------------------------------- sbh.py wrappers keep the 400

@pytest.fixture
def refused(monkeypatch):
    def refuse(url, **kwargs):
        raise BlockedDestinationError('Refusing to connect to x: non-public')

    monkeypatch.setattr(sbh_http, 'get', refuse)
    monkeypatch.setattr(sbh_http, 'post', refuse)


@pytest.fixture
def ctx():
    return StudyContext(
        token=TOKEN,
        study_uri=STUDY_URI,
        sbh_url='https://api.synbiohub.org',
        usergraph='https://synbiohub.org/user/pmeka12',
        user='pmeka12',
        study_id='Test',
    )


def test_members_does_not_turn_a_refusal_into_a_502(refused, ctx):
    with pytest.raises(BlockedDestinationError):
        sbh.members(ctx, ctx.study_uri)


def test_list_items_does_not_turn_a_refusal_into_a_502(refused, ctx):
    with pytest.raises(BlockedDestinationError):
        sbh.list_items(ctx, ctx.study_uri)


def test_submit_does_not_turn_a_refusal_into_a_502(refused, ctx, tmp_path):
    with pytest.raises(BlockedDestinationError):
        sbh.submit(ctx, COLLECTIONS['devices'], sbol2.Document(), str(tmp_path))


# ----------------------------------------------------------- legacy routes

def params_part(**params):
    return (io.BytesIO(json.dumps(params).encode()), 'parameters.json')


def upload_sbol(client, sbol_file, sbh_url):
    return client.post(
        '/api/uploadSBOL',
        data={
            'SBOL': (open(sbol_file, 'rb'), 'part.xml'),
            'Params': params_part(
                sbh_url=sbh_url, sbh_prefix='https://synbiohub.org',
                sbh_token=TOKEN, collection_url=STUDY_URI, sbh_overwrite=1,
                importType='Devices',
            ),
        },
        content_type='multipart/form-data',
    )


def test_upload_sbol_rejects_a_malformed_sbh_url(client, sbol_file):
    response = upload_sbol(client, sbol_file, REVIEW_REPRO)

    assert response.status_code == 400
    assert 'sbh_url' in response.get_json()['error']


def test_upload_sbol_refuses_a_loopback_synbiohub(
    client, real_sbh_http, listener, sbol_file,
):
    response = upload_sbol(client, sbol_file, listener.url)

    assert response.status_code == 400
    assert 'non-public' in response.get_json()['error']
    assert listener.received() == b''


def test_xdc_upload_rejects_a_malformed_sbh_url(client):
    response = client.post(
        '/api/uploadExperiment',
        data={
            'Metadata': (io.BytesIO(b'not parsed'), 'metadata.xlsx'),
            'Params': params_part(
                sbh_url=REVIEW_REPRO, sbh_prefix='https://synbiohub.org',
                sbh_token=TOKEN, fj_url=None, fj_token=None,
                collection_url=STUDY_URI, fj_study_id=None, sbh_overwrite=1,
                fj_overwrite=1, importType='Experiments',
            ),
        },
        content_type='multipart/form-data',
    )

    assert response.status_code == 400
    assert 'sbh_url' in response.get_json()['error']


def test_attachment_cleanup_only_calls_the_api_host(monkeypatch):
    """A URI read back from SPARQL is data: only its path may be requested.

    It used to be requested as-is whenever it did not start with sbh_prefix.
    """
    calls = []
    stored = 'http://169.254.169.254/latest/meta-data/x/1'

    def fake_get(url, **kwargs):
        calls.append(url)
        if '/sparql' in url:
            return FakeResponse(200, json_data={
                'results': {'bindings': [{'s': {'value': stored}}]},
            })
        return FakeResponse(200)

    def fake_post(url, **kwargs):
        calls.append(url)
        return FakeResponse(200)

    monkeypatch.setattr(sbh_http, 'get', fake_get)
    monkeypatch.setattr(sbh_http, 'post', fake_post)

    upload_sbh_attachments(
        'https://api.synbiohub.org', 'https://synbiohub.org', TOKEN, 'pmeka12',
        'https://synbiohub.org/user/pmeka12', STUDY_URI,
        {'plate.csv': io.BytesIO(b'a,b')},
    )

    assert 'https://api.synbiohub.org/latest/meta-data/x/1/remove' in calls
    assert all(url.startswith('https://api.synbiohub.org/') for url in calls)
