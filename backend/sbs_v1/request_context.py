"""Who is asking, and about which study: read from the request headers.

Connexion has already checked that the token and X-Study-Collection are present
(the spec requires them). This module checks what the spec can't: the study
URI's shape, and which SynBioHub API to talk to.
"""
import os
from dataclasses import dataclass
from urllib.parse import urlparse

from flask import request

from .errors import ApiError
from .http import SBH_URL_ENV, normalise_base_url

STUDY_HEADER = "X-Study-Collection"
SBH_URL_HEADER = "X-SynBioHub-Url"


@dataclass(frozen=True)
class StudyContext:
    token: str      # the caller's SynBioHub token. Never log or return it.
    study_uri: str  # https://<host>/user/<user>/<studyId>/<displayId>/<version>
    sbh_url: str    # the SynBioHub *API* base, e.g. https://api.synbiohub.org

    @property
    def usergraph(self):
        """https://<host>/user/<user>: the SPARQL graph holding the user's data."""
        return "/".join(self.study_uri.split("/")[:5])

    @property
    def sbh_prefix(self):
        """https://<host>: the web host the study's objects live under."""
        parsed = urlparse(self.study_uri)
        return f"{parsed.scheme}://{parsed.netloc}"

    def subcollection_uri(self, import_type):
        """The study's sub-collection for one collection, e.g. .../<studyId>/Strains/1."""
        return "/".join(self.study_uri.split("/")[:6]) + f"/{import_type}/1"

    @property
    def sbh_headers(self):
        """Headers SynBioHub expects: it takes the token as X-authorization."""
        return {"Accept": "application/json", "X-authorization": self.token}


def from_request():
    """Build a StudyContext from the current request's headers."""
    token = request.headers["Authorization"].partition(" ")[2].strip()
    study_uri = request.headers[STUDY_HEADER].strip().rstrip("/")
    _check_study_uri(study_uri)
    return StudyContext(token=token, study_uri=study_uri, sbh_url=_sbh_url(study_uri))


def _check_study_uri(study_uri):
    parsed = urlparse(study_uri)
    segments = [s for s in parsed.path.split("/") if s]
    if (parsed.scheme not in ("http", "https") or not parsed.netloc
            or len(segments) != 5 or segments[0] != "user"):
        raise ApiError(400, f"{STUDY_HEADER} must be a SynBioHub collection URI like "
                            f"https://<host>/user/<user>/<studyId>/<displayId>/<version>, "
                            f"got: {study_uri}")


def _sbh_url(study_uri):
    """X-SynBioHub-Url if given, else SBS_SBH_URL, else https://api.<study host>."""
    header = (request.headers.get(SBH_URL_HEADER) or "").strip()
    if header:
        return _checked(header, SBH_URL_HEADER)

    configured = os.environ.get(SBH_URL_ENV, "").strip()
    if configured:
        return _checked(configured, SBH_URL_ENV)

    host = urlparse(study_uri).netloc
    return _checked(host if host.startswith("api.") else f"api.{host}", STUDY_HEADER)


def _checked(url, source):
    try:
        return normalise_base_url(url)
    except ValueError as error:
        raise ApiError(400, f"{source} does not give a usable SynBioHub URL: {error}")