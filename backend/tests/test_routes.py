"""The registered /api/v1 surface, and the request plumbing behind it.

Phase 1 wires every collection route up to a handler that validates the request
and then answers 501. These tests pin the surface and the validation; the 501s
turn into real responses in later phases.
"""
import pytest

from sbs_server.app.api.registry import COLLECTIONS

from conftest import STUDY_URI, FakeResponse, auth_headers

IMPLEMENTED = [s.path for s in COLLECTIONS.values() if s.implemented]
UNSPECIFIED = [s.path for s in COLLECTIONS.values() if not s.implemented]
EXCEL_BACKED = [s.path for s in COLLECTIONS.values() if s.template_type]


def methods_for(app, rule):
    """Union of methods accepted at `rule`.

    Each verb is registered as its own Rule with its own endpoint, so one path
    appears in the map several times; werkzeug dispatches across them by method.
    """
    methods = set()
    for r in app.url_map.iter_rules():
        if r.rule == rule:
            methods |= r.methods - {'HEAD', 'OPTIONS'}
    if not methods:
        raise AssertionError(f'no route registered for {rule}')
    return methods


# ------------------------------------------------------------- the mapping

def test_import_types_match_the_frontend_object_types():
    """These displayIds are what upload_to_sbh builds sub-collection URIs from.

    They mirror frontend/src/objectTypes.js `subdirectory` run through
    capitalizeFirst() in frontend/src/API.js. Getting one wrong silently points
    a collection at the wrong -- or a brand new -- SynBioHub sub-collection.
    """
    assert {path: spec.import_type for path, spec in COLLECTIONS.items()} == {
        'resources': 'Resources',
        'devices': 'Devices',
        'designs': 'Designs',
        'plasmids': 'Plasmids',
        'strains': 'Strains',
        'sample-designs': 'SampleDesigns',
        'assays': 'Assays',
        'models': 'Models',
        'archives': 'Archives',
        'analyses': 'Analyses',
    }


def test_template_types_match_download_templates_keys():
    """Every template_type must be a key fetch_template_bytes knows about."""
    from sbs_server.app.downloadTemplates import fetch_template_bytes
    import inspect

    source = inspect.getsource(fetch_template_bytes)
    for spec in COLLECTIONS.values():
        if spec.template_type:
            assert f'"{spec.template_type}"' in source, spec.path


# -------------------------------------------------------------- the routes

@pytest.mark.parametrize('path', sorted(COLLECTIONS))
def test_every_collection_exposes_the_four_bulk_verbs(app, path):
    assert methods_for(app, f'/api/v1/{path}') == {'GET', 'POST', 'PUT', 'DELETE'}


@pytest.mark.parametrize('path', sorted(EXCEL_BACKED))
def test_excel_backed_collections_expose_a_template(app, path):
    assert methods_for(app, f'/api/v1/{path}/template') == {'GET'}


def test_only_excel_backed_collections_expose_a_template(app):
    rules = {r.rule for r in app.url_map.iter_rules()}

    for spec in COLLECTIONS.values():
        has_template = f'/api/v1/{spec.path}/template' in rules
        assert has_template == bool(spec.template_type), spec.path


def test_assays_is_the_only_per_item_route(app):
    assert methods_for(app, '/api/v1/assays/<object_id>/attachments') == {'PATCH'}

    per_item = [
        r.rule for r in app.url_map.iter_rules()
        if r.rule.startswith('/api/v1/') and '<' in r.rule
        and not r.rule.startswith('/api/v1/docs')  # Swagger UI, not an API route
    ]
    assert per_item == ['/api/v1/assays/<object_id>/attachments']


def test_unsupported_verb_is_405(client):
    """Proves werkzeug dispatches correctly across the per-verb rules."""
    response = client.patch('/api/v1/resources', headers=auth_headers())

    assert response.status_code == 405


def test_unknown_collection_is_404(client):
    assert client.get('/api/v1/nonsense', headers=auth_headers()).status_code == 404


# ---------------------------------------------------------- the validation

@pytest.mark.parametrize('path', sorted(IMPLEMENTED))
def test_valid_request_reaches_the_handler(client, fake_sbh, path):
    """Headers parsed, credentials accepted, handler runs."""
    fake_sbh.register('GET', '/sparql',
                      FakeResponse(200, json_data={'results': {'bindings': []}}))
    fake_sbh.register('GET', '/metadata', FakeResponse(200, json_data={'name': 'Test'}))

    response = client.get(f'/api/v1/{path}', headers=auth_headers())

    assert response.status_code == 200
    assert response.get_json() == []


@pytest.mark.parametrize('path', sorted(UNSPECIFIED))
def test_unspecified_collections_are_501_not_404(client, path):
    response = client.get(f'/api/v1/{path}')

    assert response.status_code == 501
    assert 'not specified' in response.get_json()['error']


@pytest.mark.parametrize('method', ['get', 'post', 'put', 'delete'])
def test_missing_credentials_are_401(client, method):
    response = getattr(client, method)(
        '/api/v1/resources',
        headers={'X-Study-Collection': STUDY_URI},
    )

    assert response.status_code == 401
    assert 'error' in response.get_json()


@pytest.mark.parametrize('method', ['get', 'post', 'put', 'delete'])
def test_missing_study_collection_is_400(client, method):
    response = getattr(client, method)(
        '/api/v1/resources',
        headers={'Authorization': 'Bearer test-token'},
    )

    assert response.status_code == 400
    assert 'X-Study-Collection' in response.get_json()['error']


def test_template_and_attach_routes_validate_too(client):
    """Both reject bad credentials before doing any work."""
    assert client.get('/api/v1/resources/template').status_code == 401
    assert client.patch('/api/v1/assays/abc/attachments').status_code == 401


def test_errors_are_json_not_html(client):
    response = client.get('/api/v1/resources')

    assert response.status_code == 401
    assert response.mimetype == 'application/json'
    assert set(response.get_json()) == {'error'}
