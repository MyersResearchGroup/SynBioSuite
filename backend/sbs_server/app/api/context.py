"""Per-request context for /api/v1.

Every request names the study it applies to in ``X-Study-Collection`` and
authenticates with a SynBioHub token in ``Authorization: Bearer <token>``. That
token is forwarded to SynBioHub as the ``X-authorization`` header the rest of the
backend already uses (see utils.py, synbiohubUpload.py).

The SynBioHub *API* base (https://api.synbiohub.org) is a different host from the
study URI's (https://synbiohub.org), so it cannot be read off the study URI alone.
It is resolved from ``X-SynBioHub-Url``, else the SBS_SBH_URL environment
variable, else derived as ``https://api.<study host>``.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlparse

from flask import request

from .errors import ApiError

STUDY_HEADER = 'X-Study-Collection'
SBH_URL_HEADER = 'X-SynBioHub-Url'
SBH_URL_ENV = 'SBS_SBH_URL'

# https://<host>/user/<user>/<studyId>/<displayId>/<version>
_STUDY_URI_SEGMENTS = 5
_EXPECTED_SHAPE = '<scheme>://<host>/user/<user>/<studyId>/<displayId>/<version>'


@dataclass(frozen=True)
class StudyContext:
    """Everything a view needs to talk to SynBioHub on the caller's behalf."""

    token: str
    study_uri: str
    sbh_url: str
    usergraph: str
    user: str
    study_id: str

    @classmethod
    def from_request(cls) -> 'StudyContext':
        token = _read_bearer_token()
        study_uri = _read_study_uri()
        user, study_id = _validate_study_uri(study_uri)
        return cls(
            token=token,
            study_uri=study_uri,
            # Identical to the slicing in synbiohubUpload.py:upload_to_sbh.
            usergraph='/'.join(study_uri.split('/')[:5]),
            sbh_url=_resolve_sbh_url(study_uri),
            user=user,
            study_id=study_id,
        )

    def subcollection_uri(self, import_type: str) -> str:
        """The sub-collection backing one API collection within this study.

        Matches upload_to_sbh's ``"/".join(parts[:6]) + "/" + importType + "/1"``.
        """
        return '/'.join(self.study_uri.split('/')[:6]) + '/' + import_type + '/1'

    @property
    def sbh_prefix(self) -> str:
        """The URI namespace this study's objects live under.

        upload_to_sbh uses it to tell an object that is already on SynBioHub
        (its identity starts with the prefix) from one this upload is creating,
        and adds only the latter to the sub-collection. The frontend calls this
        ``registryPrefix`` and reads it from the registry list; here it falls
        out of the study URI, which is itself a URI in that namespace.

        Note this is the *web* host, not ``sbh_url``: the same distinction
        upload_sbh_attachments draws when it rewrites a URI for an API call.
        """
        parsed = urlparse(self.study_uri)
        return f'{parsed.scheme}://{parsed.netloc}'

    @property
    def sbh_headers(self) -> dict:
        return {'Accept': 'application/json', 'X-authorization': self.token}


def _read_bearer_token() -> str:
    scheme, _, token = request.headers.get('Authorization', '').partition(' ')
    if scheme.lower() != 'bearer' or not token.strip():
        raise ApiError(
            401,
            "Missing or invalid Authorization header; expected "
            "'Bearer <SynBioHub token>'",
        )
    return token.strip()


def _read_study_uri() -> str:
    study_uri = (request.headers.get(STUDY_HEADER) or '').strip()
    if not study_uri:
        raise ApiError(400, f'Missing required {STUDY_HEADER} header')
    return study_uri.rstrip('/')


def _validate_study_uri(study_uri: str):
    """Reject malformed study URIs rather than silently slicing a short list."""
    parsed = urlparse(study_uri)
    if parsed.scheme not in ('http', 'https') or not parsed.netloc:
        raise ApiError(
            400,
            f'{STUDY_HEADER} must be an http(s) URI, got: {study_uri}',
        )

    segments = [seg for seg in parsed.path.split('/') if seg]
    if len(segments) != _STUDY_URI_SEGMENTS or segments[0] != 'user':
        raise ApiError(
            400,
            f'{STUDY_HEADER} must be a SynBioHub collection URI of the form '
            f'{_EXPECTED_SHAPE}, got: {study_uri}',
        )
    return segments[1], segments[2]


def _resolve_sbh_url(study_uri: str) -> str:
    override = request.headers.get(SBH_URL_HEADER) or os.environ.get(SBH_URL_ENV)
    if override and override.strip():
        return _normalise_base_url(override.strip())

    host = urlparse(study_uri).netloc
    return f'https://{host}' if host.startswith('api.') else f'https://api.{host}'


def _normalise_base_url(url: str) -> str:
    """Add a scheme when one is missing, drop a trailing slash.

    route.py:sbol_upload does the same fixup on the sbh_url it receives.
    """
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    return url.rstrip('/')
