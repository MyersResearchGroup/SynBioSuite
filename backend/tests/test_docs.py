"""The interactive docs at /api/docs and /api/v1/docs, and the spec behind them.

Swagger UI's "Try it out" buttons send real requests, so the spec they read has
to describe the running server exactly. The parity test here is the permanent
guard against the spec and the routes drifting apart.
"""
import json
import os
import re

import pytest
import yaml

SPEC_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'sbs_server', 'app', 'static', 'openapi.yaml',
)
DOCS_PAGES = ['/api/docs/', '/api/v1/docs/']
VERBS = ('get', 'post', 'put', 'delete', 'patch')


@pytest.fixture(scope='module')
def spec():
    with open(SPEC_PATH, encoding='utf-8') as handle:
        return yaml.safe_load(handle)


def user_config(html):
    """The config dict flask_swagger_ui injects into the docs page."""
    match = re.search(r'var user_config = (\{.*?\});', html)
    assert match, 'no user_config in the docs page'
    return json.loads(match.group(1))


# ------------------------------------------------------------------ the pages

@pytest.mark.parametrize('page', DOCS_PAGES)
def test_docs_page_renders(client, page):
    response = client.get(page)

    assert response.status_code == 200
    assert user_config(response.get_data(as_text=True))['url'] == '/static/openapi.yaml'


@pytest.mark.parametrize('page', DOCS_PAGES)
def test_docs_page_turns_on_the_testing_conveniences(client, page):
    config = user_config(client.get(page).get_data(as_text=True))

    assert config['persistAuthorization'] is True
    assert config['displayRequestDuration'] is True
    assert config['requestSnippetsEnabled'] is True
    assert config['filter'] is True


@pytest.mark.parametrize('page', DOCS_PAGES)
def test_try_it_out_still_needs_a_click(client, page):
    """The per-operation click is the only speed bump before DELETE or PUT."""
    config = user_config(client.get(page).get_data(as_text=True))

    assert not config.get('tryItOutEnabled')


def test_spec_is_served_as_yaml(client):
    """Tools that import a spec by URL go by the content type."""
    response = client.get('/static/openapi.yaml')

    assert response.status_code == 200
    assert response.mimetype == 'application/yaml'


# ------------------------------------------------------------------ the spec

def test_first_server_is_relative(spec):
    """Resolves against whichever host serves the docs, local or deployed.

    A hardcoded 127.0.0.1 would send every Try it out on a deployed instance
    to the viewer's own machine.
    """
    assert spec['servers'][0]['url'] == '/api/v1'


def test_no_server_points_at_the_frontend(spec):
    """synbiosuite.org is the frontend app, which answers every path with 200
    and an HTML page -- so requests sent there appear to succeed."""
    assert not [s for s in spec['servers'] if 'synbiosuite.org' in s['url']]


def test_spec_and_routes_agree(app, spec):
    """Every (path, verb) the spec documents exists, and nothing undocumented does.

    Path parameters are compared by position only: the spec calls it {id},
    the route calls it <object_id>.
    """
    documented = {
        (re.sub(r'\{[^}]+\}', '{}', path), verb.upper())
        for path, item in spec['paths'].items()
        for verb in VERBS if verb in item
    }
    registered = {
        (re.sub(r'<[^>]+>', '{}', rule.rule[len('/api/v1'):]), method)
        for rule in app.url_map.iter_rules()
        if rule.rule.startswith('/api/v1/') and not rule.rule.startswith('/api/v1/docs')
        for method in rule.methods - {'HEAD', 'OPTIONS'}
    }

    assert documented - registered == set(), 'documented but not served'
    assert registered - documented == set(), 'served but not documented'
