"""The generated /api/v1 server (connexion_app.py): GET /status, GET /strains,
and the error contract Connexion has to honour for every operation.

These go through the same WSGI adapter uwsgi serves, so Connexion's routing,
security and validation all run.
"""
import importlib
import io
import os
from urllib.parse import unquote_plus

import pytest
import yaml
from inflection import underscore

from sbs_server.app.api import impl, sbh
from sbs_server.app.api.errors import UNEXPECTED_FAILURE
from sbs_server.app.version import __version__

from conftest import STUDY_URI, TOKEN, FakeResponse, auth_headers, generated_client

SPEC_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'sbs_server', 'app', 'static', 'openapi.yaml',
)
HTTP_METHODS = ('get', 'post', 'put', 'patch', 'delete')
OPERATION_COUNT = 46
STRAIN_URI = 'https://synbiohub.org/user/pmeka12/Test/strain_a/1'


@pytest.fixture
def v1():
    return generated_client()


def sparql(*rows):
    return FakeResponse(200, json_data={'results': {'bindings': list(rows)}})


def strain_row():
    return {'s': {'value': STRAIN_URI}, 'id': {'value': 'strain_a'}}


def assert_error(response, status):
    """The spec's Error schema: a JSON object with the one key, `error`."""
    assert response.status_code == status
    assert response.mimetype == 'application/json'
    body = response.get_json()
    assert list(body) == ['error']
    assert isinstance(body['error'], str) and body['error']
    return body['error']


# ------------------------------------------------------------------ GET /status

def test_status_needs_no_token_or_study(v1):
    response = v1.get('/api/v1/status')

    assert response.status_code == 200
    assert response.get_json() == {'status': 'working', 'version': __version__}


# ----------------------------------------------------------------- GET /strains

def test_strains_lists_the_sub_collection_as_items(v1, fake_sbh):
    fake_sbh.register('GET', '/sparql', sparql(strain_row()))

    response = v1.get('/api/v1/strains', headers=auth_headers())

    assert response.status_code == 200
    assert response.get_json() == [{
        'uri': STRAIN_URI,
        'displayId': 'strain_a',
        'name': None,
        'description': None,
        'type': [],
        'role': [],
    }]


def test_strains_queries_the_strains_sub_collection_with_the_callers_token(v1, fake_sbh):
    fake_sbh.register('GET', '/sparql', sparql(strain_row()))

    v1.get('/api/v1/strains', headers=auth_headers())

    query = fake_sbh.calls_matching('/sparql')[0]
    assert query.url.startswith('https://api.synbiohub.org/')
    assert query.headers['X-authorization'] == TOKEN
    assert '/user/pmeka12/Test/Strains/1' in unquote_plus(query.url)


def test_strains_of_an_existing_study_with_no_members_is_an_empty_list(v1, fake_sbh):
    fake_sbh.register('GET', '/sparql', sparql())
    fake_sbh.register('GET', '/metadata', FakeResponse(200, json_data=[{'displayId': 'x'}]))

    response = v1.get('/api/v1/strains', headers=auth_headers())

    assert response.status_code == 200
    assert response.get_json() == []


def test_strains_of_a_study_that_does_not_exist_is_a_404(v1, fake_sbh):
    fake_sbh.register('GET', '/sparql', sparql())
    fake_sbh.register('GET', '/metadata', FakeResponse(200, json_data=[]))

    response = v1.get('/api/v1/strains', headers=auth_headers())

    assert STUDY_URI in assert_error(response, 404)


def test_strains_as_rdf_when_the_client_asks_for_it(v1, monkeypatch):
    monkeypatch.setattr(sbh, 'fetch_collection_sbol', lambda ctx, uri: b'<rdf:RDF/>')

    response = v1.get(
        '/api/v1/strains', headers=auth_headers(Accept='application/rdf+xml'),
    )

    assert response.status_code == 200
    assert response.mimetype == 'application/rdf+xml'
    assert response.get_data() == b'<rdf:RDF/>'


# ------------------------------------------------------------ the error contract

def test_a_missing_token_is_a_401(v1):
    response = v1.get('/api/v1/strains', headers=auth_headers(Authorization=None))

    assert_error(response, 401)


def test_a_non_bearer_scheme_is_a_401(v1):
    response = v1.get(
        '/api/v1/strains', headers=auth_headers(Authorization='Basic abc'),
    )

    assert_error(response, 401)


def test_a_missing_study_header_is_a_400_that_names_the_header(v1):
    headers = auth_headers(**{'X-Study-Collection': None})

    response = v1.get('/api/v1/strains', headers=headers)

    assert 'X-Study-Collection' in assert_error(response, 400)


def test_a_malformed_study_uri_is_a_400(v1):
    headers = auth_headers(**{'X-Study-Collection': 'https://synbiohub.org/not/a/study'})

    response = v1.get('/api/v1/strains', headers=headers)

    assert 'X-Study-Collection' in assert_error(response, 400)


def test_the_token_is_checked_before_the_study_header(v1):
    response = v1.get('/api/v1/strains')

    assert_error(response, 401)


def test_an_unknown_path_under_the_api_is_a_json_404(v1):
    response = v1.get('/api/v1/no-such-collection', headers=auth_headers())

    assert_error(response, 404)


def test_a_method_the_spec_does_not_define_is_a_json_405(v1):
    response = v1.put('/api/v1/status')

    assert_error(response, 405)


def test_an_operation_with_no_implementation_yet_is_a_501(v1):
    response = v1.delete('/api/v1/strains', headers=auth_headers())

    assert 'clear_strains' in assert_error(response, 501)


def test_an_upload_with_the_wrong_content_type_is_a_415(v1):
    response = v1.post('/api/v1/strains', headers=auth_headers(), json={})

    assert_error(response, 415)


def test_an_upload_without_its_file_part_is_a_400(v1):
    response = v1.post(
        '/api/v1/strains',
        headers=auth_headers(),
        data={'params': '{}'},
        content_type='multipart/form-data',
    )

    assert 'file' in assert_error(response, 400)


def test_an_unexpected_failure_is_a_500_that_keeps_the_details_in_the_log(
    v1, monkeypatch, caplog,
):
    def broken(ctx, collection_uri):
        raise RuntimeError('cannot open /srv/sbs/uploads/internal.xml')

    monkeypatch.setattr(sbh, 'list_items', broken)

    response = v1.get('/api/v1/strains', headers=auth_headers())

    assert assert_error(response, 500) == UNEXPECTED_FAILURE
    assert 'cannot open /srv/sbs/uploads/internal.xml' in caplog.text


def test_errors_carry_cors_headers_so_a_browser_can_read_them(v1):
    response = v1.get('/api/v1/strains', headers={'Origin': 'http://localhost:3000'})

    assert response.status_code == 401
    assert response.headers['Access-Control-Allow-Origin'] == '*'


# ------------------------------------------------------- uploads reach handlers

def test_upload_handlers_receive_the_file_and_the_params_field(v1, monkeypatch):
    """Connexion passes non-file form fields in one `body` dict; the generated
    controller unpacks `params` from it."""
    received = {}

    def create_strains(file, params):
        received.update(filename=file.filename, params=params)
        return {'status': 'success', 'message': 'ok'}, 201

    monkeypatch.setattr(impl, 'create_strains', create_strains, raising=False)

    response = v1.post(
        '/api/v1/strains',
        headers=auth_headers(),
        data={'file': (io.BytesIO(b'<rdf/>'), 'strains.xml'), 'params': '{"k": 1}'},
    )

    assert response.status_code == 201
    assert received == {'filename': 'strains.xml', 'params': '{"k": 1}'}


def test_the_path_parameter_reaches_the_attachment_handler(v1, monkeypatch):
    received = {}

    def attach_to_assay(display_id, file):
        received.update(display_id=display_id, filename=file.filename)
        return {'status': 'success', 'message': 'ok'}, 200

    monkeypatch.setattr(impl, 'attach_to_assay', attach_to_assay, raising=False)

    response = v1.patch(
        '/api/v1/assays/assay_1/attachments',
        headers=auth_headers(),
        data={'file': (io.BytesIO(b'data'), 'plate.csv')},
    )

    assert response.status_code == 200
    assert received == {'display_id': 'assay_1', 'filename': 'plate.csv'}


# ------------------------------------------------- the spec and generated code

def _operations():
    with open(SPEC_PATH, encoding='utf-8') as handle:
        spec = yaml.safe_load(handle)
    return [
        operation
        for path_item in spec['paths'].values()
        for method, operation in path_item.items()
        if method in HTTP_METHODS
    ]


def test_every_operation_in_the_spec_has_a_generated_controller_function():
    """Fails when the spec changes and codegen/generate.sh has not been rerun."""
    operations = _operations()

    missing = [
        operation['operationId']
        for operation in operations
        if not hasattr(
            importlib.import_module(operation['x-openapi-router-controller']),
            underscore(operation['operationId']),
        )
    ]

    assert len(operations) == OPERATION_COUNT
    assert missing == []


def test_the_served_spec_keeps_the_hyphenated_header_names(v1):
    spec = v1.get('/static/openapi.yaml').get_data(as_text=True)

    assert 'name: X-Study-Collection' in spec
    assert 'name: X-SynBioHub-Url' in spec
    assert 'X_Study_Collection' not in spec


# ------------------------------------------------------------- the legacy routes

def test_the_legacy_status_route_is_served_by_the_same_application(v1):
    response = v1.get('/api/status')

    assert response.status_code == 200
    assert response.get_json() == {'status': 'working', 'version': __version__}


def test_a_404_outside_the_api_is_still_flasks_page(v1):
    response = v1.get('/no-such-page')

    assert response.status_code == 404
    assert response.mimetype == 'text/html'
