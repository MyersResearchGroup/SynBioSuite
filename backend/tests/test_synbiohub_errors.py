"""A SynBioHub that says no raises SynBioHubError, with the text it always had.

Callers put that text in their answer -- the legacy routes after a prefix,
/api/v1 inside a 502 -- so the message is part of what a caller sees. The
class is what lets /api/uploadSBOL tell these failures from an unexpected one.
"""
import io

import pytest
import sbol2

from sbs_server.app.sbh_http import SynBioHubError
from sbs_server.app.synbiohubUpload import upload_sbh_attachments, upload_to_sbh
from sbs_server.app.utils import get_sbh_user, sparql_query

from conftest import STUDY_URI, TOKEN, FakeResponse
from legacy_helpers import LOGIN_GRAPH, SBH_PREFIX, SBH_URL, SBH_USER, bindings

MERGE_AND_OVERWRITE = 3
EXISTING_ATTACHMENT = 'https://synbiohub.org/user/pmeka12/Test/attachment_1/1'


def attach_notes():
    upload_sbh_attachments(
        SBH_URL, SBH_PREFIX, TOKEN, SBH_USER, LOGIN_GRAPH, STUDY_URI,
        {'notes.txt': io.BytesIO(b'lab notes')},
    )


def test_it_is_an_exception_like_the_bare_one_it_replaces():
    """Every existing `except Exception` around these calls still catches it."""
    assert issubclass(SynBioHubError, Exception)


def test_a_rejected_profile_request(legacy_sbh):
    legacy_sbh.register('GET', '/profile', FakeResponse(401, text='bad token'))

    with pytest.raises(SynBioHubError) as excinfo:
        get_sbh_user(SBH_URL, TOKEN)

    assert str(excinfo.value) == 'Error accessing SynBioHub profile (401): bad token'


def test_a_failed_query(legacy_sbh):
    legacy_sbh.register('GET', '/sparql', FakeResponse(500, text='boom'))

    with pytest.raises(SynBioHubError) as excinfo:
        sparql_query(SBH_URL, TOKEN, 'SELECT ?s WHERE { ?s ?p ?o }')

    assert str(excinfo.value) == 'SynBioHub sparql query failed (500): boom'


def test_a_query_answered_with_something_that_is_not_json(legacy_sbh):
    """requests raises a ValueError for it; the text is kept, the class is not."""
    legacy_sbh.register('GET', '/sparql', FakeResponse(200, text='<html>'))

    with pytest.raises(SynBioHubError) as excinfo:
        sparql_query(SBH_URL, TOKEN, 'SELECT ?s WHERE { ?s ?p ?o }')

    assert isinstance(excinfo.value.__cause__, ValueError)
    assert str(excinfo.value) == str(excinfo.value.__cause__)


def test_a_rejected_submit(legacy_sbh, tmp_path):
    legacy_sbh.register('GET', '/sparql', bindings())
    legacy_sbh.register('POST', '/submit', FakeResponse(500, text='boom'))

    with pytest.raises(SynBioHubError) as excinfo:
        upload_to_sbh(
            sbol2.Document(), SBH_URL, SBH_PREFIX, TOKEN, LOGIN_GRAPH, STUDY_URI,
            'Resources', str(tmp_path / 'out.xml'), MERGE_AND_OVERWRITE,
        )

    assert str(excinfo.value) == 'SynBioHub submit failed (500): boom'


def test_a_rejected_attachment(legacy_sbh):
    legacy_sbh.register('GET', '/sparql', bindings())
    legacy_sbh.register('POST', '/attach', FakeResponse(500, text='no room'))

    with pytest.raises(SynBioHubError) as excinfo:
        attach_notes()

    assert str(excinfo.value) == (
        'Uploading attachments to SynBioHub failed (500): no room'
    )


def test_an_attachment_that_cannot_be_replaced(legacy_sbh):
    legacy_sbh.register('GET', '/sparql', bindings(EXISTING_ATTACHMENT))
    legacy_sbh.register('GET', '/remove', FakeResponse(500, text='locked'))

    with pytest.raises(SynBioHubError) as excinfo:
        attach_notes()

    assert str(excinfo.value) == 'Deleting existing attachment failed (500): locked'
