"""StudyContext: header parsing, URI derivation, and the failure modes.

The derivation tests exist to keep this API pointed at exactly the same
sub-collections as synbiohubUpload.py:upload_to_sbh, whose URI slicing is
reproduced inline here rather than imported, so that a change to either side
fails the test.
"""
import pytest

from sbs_server.app.api.context import (
    SBH_URL_ENV,
    SBH_URL_HEADER,
    STUDY_HEADER,
    StudyContext,
)
from sbs_server.app.api.errors import ApiError
from sbs_server.app.api.registry import COLLECTIONS

from conftest import STUDY_URI, TOKEN, auth_headers


def build_context(app, **header_overrides):
    with app.test_request_context(headers=auth_headers(**header_overrides)):
        return StudyContext.from_request()


# --------------------------------------------------------------- derivation

def test_usergraph_matches_upload_to_sbh_slicing(app):
    ctx = build_context(app)

    # synbiohubUpload.py:upload_to_sbh -> usergraph = "/".join(parts[:5])
    assert ctx.usergraph == '/'.join(STUDY_URI.split('/')[:5])
    assert ctx.usergraph == 'https://synbiohub.org/user/pmeka12'


def test_subcollection_uri_matches_upload_to_sbh_slicing(app):
    ctx = build_context(app)
    parts = STUDY_URI.split('/')

    for spec in COLLECTIONS.values():
        # upload_to_sbh -> "/".join(parts[:6]) + "/" + importType + "/1"
        expected = '/'.join(parts[:6]) + '/' + spec.import_type + '/1'
        assert ctx.subcollection_uri(spec.import_type) == expected

    assert ctx.subcollection_uri('Resources') == (
        'https://synbiohub.org/user/pmeka12/Test/Resources/1'
    )


def test_user_and_study_id_are_extracted(app):
    ctx = build_context(app)

    assert ctx.user == 'pmeka12'
    assert ctx.study_id == 'Test'
    assert ctx.token == TOKEN


def test_trailing_slash_on_study_uri_is_tolerated(app):
    ctx = build_context(app, **{STUDY_HEADER: STUDY_URI + '/'})

    assert ctx.study_uri == STUDY_URI
    assert ctx.subcollection_uri('Devices').endswith('/Test/Devices/1')


def test_token_is_forwarded_as_synbiohub_x_authorization(app):
    ctx = build_context(app)

    assert ctx.sbh_headers['X-authorization'] == TOKEN


# ------------------------------------------------------- SynBioHub base URL

def test_sbh_url_defaults_to_api_subdomain_of_study_host(app):
    assert build_context(app).sbh_url == 'https://api.synbiohub.org'


def test_sbh_url_env_var_overrides_the_derived_default(app, monkeypatch):
    monkeypatch.setenv(SBH_URL_ENV, 'https://sbh.example.org')

    assert build_context(app).sbh_url == 'https://sbh.example.org'


def test_sbh_url_header_overrides_the_env_var(app, monkeypatch):
    monkeypatch.setenv(SBH_URL_ENV, 'https://sbh.example.org')
    ctx = build_context(app, **{SBH_URL_HEADER: 'https://from-header.example.org'})

    assert ctx.sbh_url == 'https://from-header.example.org'


@pytest.mark.parametrize(
    'given, expected',
    [
        ('api.synbiohub.org', 'https://api.synbiohub.org'),
        ('https://api.synbiohub.org/', 'https://api.synbiohub.org'),
        ('http://localhost:7777/', 'http://localhost:7777'),
    ],
)
def test_sbh_url_header_is_normalised(app, given, expected):
    assert build_context(app, **{SBH_URL_HEADER: given}).sbh_url == expected


def test_api_host_study_uri_is_not_double_prefixed(app):
    ctx = build_context(
        app,
        **{STUDY_HEADER: 'https://api.synbiohub.org/user/u/S/S_collection/1'},
    )

    assert ctx.sbh_url == 'https://api.synbiohub.org'


# ----------------------------------------------------------- failure modes

@pytest.mark.parametrize(
    'authorization',
    [None, '', 'Bearer', 'Bearer   ', 'Basic abc123', TOKEN],
)
def test_bad_authorization_is_401(app, authorization):
    with pytest.raises(ApiError) as excinfo:
        build_context(app, Authorization=authorization)

    assert excinfo.value.status == 401


@pytest.mark.parametrize(
    'study_uri',
    [
        None,
        '',
        '   ',
        'not-a-uri',
        'ftp://synbiohub.org/user/u/S/S_collection/1',
        'https://synbiohub.org/user/pmeka12/Test',           # too few segments
        'https://synbiohub.org/user/u/S/S_collection/1/x',   # too many
        'https://synbiohub.org/public/u/S/S_collection/1',   # not /user/
        'https:///user/u/S/S_collection/1',                  # no host
    ],
)
def test_bad_study_collection_header_is_400(app, study_uri):
    with pytest.raises(ApiError) as excinfo:
        build_context(app, **{STUDY_HEADER: study_uri})

    assert excinfo.value.status == 400
