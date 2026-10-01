"""Shared fixtures for the backend test suite.

Run from backend/:  python -m pytest
"""
import os
import sys

import pytest
import requests

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# --------------------------------------------------------- live-test credentials

TEST_ENV_FILE = os.path.join(BACKEND_DIR, '.env.test')
LIVE_ENV_VARS = (
    'SBS_TEST_SBH_URL',
    'SBS_TEST_SBH_TOKEN',
    'SBS_TEST_STUDY_COLLECTION',
)
# Only destructive live tests need this one.
SCRATCH_ENV_VAR = 'SBS_TEST_SCRATCH_COLLECTION'


def _load_test_env(path=TEST_ENV_FILE):
    """Read backend/.env.test into the environment, if it exists.

    Holds a real SynBioHub token, so it is gitignored (*.env* in .gitignore) and
    its values are never printed. A variable already set in the real environment
    wins, so CI can override the file.
    """
    if not os.path.exists(path):
        return
    with open(path, encoding='utf-8') as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            value = value.strip().strip('"').strip("'")
            # Copying a token out of a zsh terminal picks up the trailing '%'
            # that zsh prints for output with no final newline. No SynBioHub
            # token (a UUID) ends in '%', so this is always a paste artifact.
            value = value.rstrip('%')
            key = key.strip()
            # Tokens and URIs never contain whitespace. A value that does means
            # the line got mangled -- e.g. a comment welded onto it by an append
            # to a file with no trailing newline. Fail here rather than send a
            # corrupt URI to SynBioHub and get back an opaque SPARQL error.
            if value.split() != [value]:
                raise ValueError(
                    f'{key} in {os.path.basename(path)} contains whitespace, so '
                    f'the line is malformed. Check the file has one KEY=VALUE '
                    f'per line and ends with a newline.'
                )
            os.environ.setdefault(key, value)


_load_test_env()

MISSING_LIVE_ENV = [name for name in LIVE_ENV_VARS if not os.environ.get(name)]

requires_live = pytest.mark.skipif(
    bool(MISSING_LIVE_ENV),
    reason=f'set {", ".join(MISSING_LIVE_ENV)} in {TEST_ENV_FILE} to run live tests',
)

requires_scratch = pytest.mark.skipif(
    bool(MISSING_LIVE_ENV) or not os.environ.get(SCRATCH_ENV_VAR),
    reason=f'set {SCRATCH_ENV_VAR} in {TEST_ENV_FILE} (a THROWAWAY collection) '
           f'to run destructive live tests',
)

from sbs_server.app.api.context import SBH_URL_ENV  # noqa: E402
from sbs_server.app.main import app as flask_app  # noqa: E402

STUDY_URI = 'https://synbiohub.org/user/pmeka12/Test/Test_collection/1'
TOKEN = 'test-token'


@pytest.fixture(autouse=True)
def _isolate_sbh_env(monkeypatch):
    """A developer's real SBS_SBH_URL must not change what the tests assert."""
    monkeypatch.delenv(SBH_URL_ENV, raising=False)


@pytest.fixture(autouse=True)
def _block_network(request, monkeypatch):
    """No test may reach the real SynBioHub.

    Without this a handler that forgets its fake would quietly hit
    api.synbiohub.org -- and a write test would hit it with real credentials.
    Tests that need HTTP use the fake_sbh fixture, which re-patches over this.
    """
    if request.node.get_closest_marker('live'):
        return  # @pytest.mark.live opts in to real HTTP, deliberately.

    def _blocked(*args, **kwargs):
        raise AssertionError(
            'This test made a real HTTP request. Use the fake_sbh fixture.'
        )

    monkeypatch.setattr(requests, 'get', _blocked)
    monkeypatch.setattr(requests, 'post', _blocked)


@pytest.fixture
def app():
    flask_app.config.update(TESTING=True)
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()


def auth_headers(**overrides):
    """The headers a well-formed /api/v1 request carries."""
    headers = {
        'Authorization': f'Bearer {TOKEN}',
        'X-Study-Collection': STUDY_URI,
    }
    headers.update(overrides)
    return {k: v for k, v in headers.items() if v is not None}


class FakeResponse:
    """The slice of requests.Response the backend actually touches."""

    def __init__(self, status_code=200, json_data=None, content=b'', text=''):
        self.status_code = status_code
        self._json = json_data
        self.content = content
        self.text = text or (content.decode('utf-8', 'replace') if content else '')

    @property
    def ok(self):
        return 200 <= self.status_code < 400

    def json(self):
        if self._json is None:
            raise ValueError('no JSON body registered for this response')
        return self._json


def existing_study():
    """<study>/metadata for a study that exists."""
    return FakeResponse(200, json_data=[{'displayId': 'Test_collection'}])


def missing_study():
    """<study>/metadata for one that doesn't: 200 with an empty array, not a
    404 -- verified against a live SynBioHub."""
    return FakeResponse(200, json_data=[])


class RecordedRequest:
    def __init__(self, method, url, kwargs):
        self.method = method
        self.url = url
        self.kwargs = kwargs

    @property
    def headers(self):
        return self.kwargs.get('headers') or {}

    def __repr__(self):
        return f'<{self.method} {self.url}>'


class FakeSynBioHub:
    """A stand-in for SynBioHub that records calls and replays canned responses.

    Replaces the `responses` library, which cannot be installed without breaking
    excel2sbol's requests==2.25.1 pin.
    """

    def __init__(self):
        self.calls = []
        self._routes = []

    def register(self, method, url_contains, response):
        """Register a response. Pass a list to return each in turn.

        A list lets a test drive a sequence like "the submit fails, then the
        rollback submit succeeds"; the last entry repeats once exhausted.
        """
        self._routes.append((method.upper(), url_contains, response))
        return response

    def get(self, url, **kwargs):
        return self._dispatch('GET', url, kwargs)

    def post(self, url, **kwargs):
        return self._dispatch('POST', url, kwargs)

    def calls_matching(self, url_contains):
        return [c for c in self.calls if url_contains in c.url]

    def _dispatch(self, method, url, kwargs):
        self.calls.append(RecordedRequest(method, url, kwargs))
        for route_method, fragment, response in self._routes:
            if route_method == method and fragment in url:
                if isinstance(response, list):
                    return response.pop(0) if len(response) > 1 else response[0]
                return response
        raise AssertionError(
            f'FakeSynBioHub received an unregistered request: {method} {url}'
        )


@pytest.fixture
def fake_sbh(monkeypatch, _block_network):
    """Intercept every requests.get/post the backend makes to SynBioHub."""
    sbh = FakeSynBioHub()
    monkeypatch.setattr(requests, 'get', sbh.get)
    monkeypatch.setattr(requests, 'post', sbh.post)
    return sbh


@pytest.fixture
def sbol_file(tmp_path):
    """A minimal valid SBOL2 document on disk."""
    import sbol2

    # doc.write() otherwise POSTs the document to validator.sbolstandard.org.
    sbol2.Config.setOption(sbol2.ConfigOptions.VALIDATE, False)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
    sbol2.setHomespace('https://example.com/')

    doc = sbol2.Document()
    doc.addComponentDefinition(sbol2.ComponentDefinition('test_part'))

    path = tmp_path / 'part.xml'
    doc.write(str(path))
    return str(path)


@pytest.fixture
def live():
    """Real SynBioHub coordinates from .env.test. Never log `token`."""
    class Live:
        url = os.environ.get('SBS_TEST_SBH_URL', '')
        token = os.environ.get('SBS_TEST_SBH_TOKEN', '')
        study = os.environ.get('SBS_TEST_STUDY_COLLECTION', '')
        # Destructive tests use this one; `study` stays read-only.
        scratch = os.environ.get('SBS_TEST_SCRATCH_COLLECTION', '')

        def _headers(self, collection):
            return {
                'Authorization': f'Bearer {self.token}',
                'X-Study-Collection': collection,
                'X-SynBioHub-Url': self.url,
            }

        @property
        def headers(self):
            return self._headers(self.study)

        @property
        def scratch_headers(self):
            # The only thing separating a throwaway collection from a real one
            # is which env var it was typed into. Destructive tests empty the
            # collection they point at, so refuse to run when the two match.
            if self.scratch.rstrip('/') and self.scratch.rstrip('/') == self.study.rstrip('/'):
                raise AssertionError(
                    f'{SCRATCH_ENV_VAR} points at the same collection as the '
                    f'read-only study ({self.study}). Destructive tests would '
                    f'empty it. Point {SCRATCH_ENV_VAR} at a throwaway study.'
                )
            return self._headers(self.scratch)

    return Live()


@pytest.hookimpl(hookwrapper=True, tryfirst=True)
def pytest_runtest_makereport(item, call):
    """Redact the live token from any failure report.

    pytest renders the arguments of every frame in a traceback, so a raised
    exception inside utils.sparql_query(sbh_url, sbh_token, ...) would otherwise
    print the real token into the terminal, CI logs, and scrollback.
    """
    outcome = yield
    report = outcome.get_result()

    token = os.environ.get('SBS_TEST_SBH_TOKEN')
    if token and report.longrepr is not None:
        rendered = str(report.longrepr)
        if token in rendered:
            report.longrepr = rendered.replace(token, '<SBS_TEST_SBH_TOKEN redacted>')
