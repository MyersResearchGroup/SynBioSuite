"""Shared fakes for the sbs_v1 tests. SynBioHub is never contacted: sbs_v1.http.get is patched."""
import sys
from pathlib import Path

import pytest
from flask import Flask

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # so `import sbs_v1` works

from sbs_v1 import handlers, http  # noqa: E402
from sbs_v1.request_context import StudyContext  # noqa: E402

STUDY_URI = "https://sbh.example.org/user/alice/study1/study1_collection/1"


class FakeResponse:
    """The parts of requests.Response that sbs_v1.synbiohub reads."""

    def __init__(self, status_code=200, json_body=None, text=""):
        self.status_code = status_code
        self.ok = status_code < 400
        self._json_body = json_body
        self.text = text

    def json(self):
        if self._json_body is None:
            raise ValueError("not JSON")
        return self._json_body


def sparql_answer(*bindings):
    """A SPARQL JSON result with the given rows; each row is {variable: value}."""
    rows = [{name: {"value": value} for name, value in row.items()} for row in bindings]
    return FakeResponse(200, {"results": {"bindings": rows}})


@pytest.fixture
def ctx():
    return StudyContext(token="test-token", study_uri=STUDY_URI,
                        sbh_url="https://api.sbh.example.org")


@pytest.fixture
def get_strains(monkeypatch):
    """Call handle("GET", "/strains") as the generated controller would.

    Extra keyword arguments are added as request headers. SBS_SBH_URL starts
    unset; a test may set it afterwards.
    """
    monkeypatch.delenv(http.SBH_URL_ENV, raising=False)
    app = Flask(__name__)

    def call(**extra_headers):
        headers = {"Authorization": "Bearer test-token", "X-Study-Collection": STUDY_URI,
                   "Accept": "application/json", **extra_headers}
        with app.test_request_context("/api/v1/strains", headers=headers):
            return handlers.handle("GET", "/strains")

    return call


@pytest.fixture
def fake_sbh(monkeypatch):
    """Patch http.get to answer from a table of url-substring -> response or exception.

    Returns the list of URLs requested, so tests can check what was asked.
    """
    requested = []

    def install(answers):
        def fake_get(url, **kwargs):
            requested.append(url)
            for fragment, answer in answers.items():
                if fragment in url:
                    if isinstance(answer, Exception):
                        raise answer
                    return answer
            raise AssertionError(f"unexpected SynBioHub request: {url}")

        monkeypatch.setattr(http, "get", fake_get)
        return requested

    return install
