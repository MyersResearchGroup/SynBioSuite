"""The liveness endpoints -- and a guard that /api/v1 did not disturb /api/*."""
from sbs_server.app.version import __version__


def test_v1_status_needs_no_auth(client):
    response = client.get('/api/v1/status')

    assert response.status_code == 200
    assert response.get_json() == {'status': 'working', 'version': __version__}


def test_legacy_status_still_works(client):
    """The frontend depends on every existing /api/* route."""
    response = client.get('/api/status')

    assert response.status_code == 200
    assert response.get_json() == {'status': 'working', 'version': __version__}


def test_legacy_routes_are_untouched(app):
    rules = {r.rule for r in app.url_map.iter_rules()}

    assert {
        '/api/status',
        '/api/downloadTemplate',
        '/api/uploadSBOL',
        '/api/uploadResource',
        '/api/uploadExperiment',
        '/api/uploadAssembly',
        '/api/uploadTransformation',
        '/api/inspect_request',
    } <= rules
