"""Shared pieces for the tests of the legacy /api/* routes (test_legacy_*.py).

Fixtures live in conftest.py (legacy_sbh, workdir, unhandled_client); this is
the plain data and functions those tests build requests and assertions from.
"""
import io
import json
import os
from urllib.parse import parse_qs, urlsplit

from sbs_server.app import sbh_http

from conftest import STUDY_URI, FakeResponse

SBH_URL = 'https://api.synbiohub.org'
SBH_PREFIX = 'https://synbiohub.org'
SBH_USER = 'pmeka12'

# https://synbiohub.org/user/pmeka12/Test: what the returned URLs hang off.
STUDY_ROOT = '/'.join(STUDY_URI.split('/')[:6])
# Where an attachment goes when the upload holds no Experiment.
ATTACH_URL = f'{SBH_URL}/user/{SBH_USER}/Test/Test_collection/1/attach'

# sbol_upload submits with the graph it slices out of collection_url; every
# other query uses the graph /profile returns. On a real account the two are
# equal, so the fake returns a different one to show which is used where.
COLLECTION_GRAPH = '/'.join(STUDY_URI.split('/')[:5])
LOGIN_GRAPH = 'https://synbiohub.org/user/login_graph'

# Temp files are named f'{uuid4()}_{name}'.
UUID_PREFIX_LENGTH = len('00000000-0000-0000-0000-000000000000_')


def params_part(params, filename='parameters.json'):
    """The Params part the frontend sends: the request's settings as a JSON file."""
    return (io.BytesIO(json.dumps(params).encode()), filename)


def raw_part(body: bytes, filename: str):
    return (io.BytesIO(body), filename)


def file_part(path, filename: str):
    with open(path, 'rb') as handle:
        return raw_part(handle.read(), filename)


def post(client, url, **parts):
    return client.post(url, data=parts, content_type='multipart/form-data')


def without(mapping, key):
    return {name: value for name, value in mapping.items() if name != key}


def logged_in(graph=LOGIN_GRAPH):
    """<sbh_url>/profile for a valid token."""
    return FakeResponse(200, json_data={'username': SBH_USER, 'graphUri': graph})


def bindings(*uris):
    """A SPARQL answer listing `uris`; none by default."""
    return FakeResponse(200, json_data={
        'results': {'bindings': [{'s': {'value': uri}} for uri in uris]},
    })


def synbiohub_answers(sbh, *, profile=None, attachment_lookup=None, members=None,
                      attach=None, submit=None):
    """Register an answer for every SynBioHub call the legacy uploads make.

    Each one succeeds unless the test passes its own. The attachment lookup is
    registered ahead of the member query: both are /sparql, and FakeSynBioHub
    answers with the first match.
    """
    sbh.register('GET', '/profile', profile or logged_in())
    sbh.register('GET', 'dcterms', attachment_lookup or bindings())
    sbh.register('GET', '/sparql', members or bindings())
    sbh.register('POST', '/attach', attach or FakeResponse(200, text='ok'))
    sbh.register('POST', '/submit', submit or FakeResponse(200, text='Successfully uploaded'))


def requested(sbh):
    """Every call SynBioHub received, as 'METHOD url' without the query string."""
    return [f'{call.method} {call.url.split("?")[0]}' for call in sbh.calls]


def sparql_queries(sbh):
    """The text of each SPARQL query SynBioHub received, in order."""
    return [
        parse_qs(urlsplit(call.url).query)['query'][0]
        for call in sbh.calls_matching('/sparql')
    ]


def capture_attached(monkeypatch):
    """Record (filename, bytes) for every file POSTed as an attachment.

    Reads each stream from wherever it stands to its end, as requests does when
    it sends one -- so a stream the route forgot to rewind shows up as b''.
    Wraps whatever sbh_http.post currently is; call it after capture_submitted.
    """
    attached = []
    forward = sbh_http.post

    def capture(url, **kwargs):
        part = (kwargs.get('files') or {}).get('file')
        if part is not None:
            filename, stream = part
            attached.append((filename, stream.read()))
        return forward(url, **kwargs)

    monkeypatch.setattr(sbh_http, 'post', capture)
    return attached


def leftovers(directory):
    """Names of the files left in `directory`, without their uuid prefix, sorted."""
    directory = str(directory)
    if not os.path.isdir(directory):
        return []
    return sorted(
        name[UUID_PREFIX_LENGTH:]
        for name in os.listdir(directory)
        if os.path.isfile(os.path.join(directory, name))
    )
