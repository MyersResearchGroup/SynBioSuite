"""Hand out a blank Excel template with its lookup sheets filled from a study.

Behind POST /api/downloadTemplate. downloadTemplates.build_template does the
work, and GET /api/v1/{collection}/template shares it.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from io import BytesIO
from typing import Tuple

from ..downloadTemplates import UnknownTemplateError, build_template
from ..errors import ApiError
from ..sbh_http import BlockedDestinationError
from .common import SYNBIOHUB_FAILURES, read_params, sbh_base_url

logger = logging.getLogger(__name__)

REQUIRED_PARAMS = ('template_type', 'sbh_url', 'sbh_prefix', 'sbh_token', 'collection_url')

# Failures whose message is fit to show the caller: SynBioHub's or GitHub's,
# and a template type that does not exist. (A refused destination is among
# SYNBIOHUB_FAILURES but is answered 400 before these are consulted.) Anything
# else is unexpected; the caller is told only that it failed, and the
# exception goes to the log.
REPORTED_FAILURES = (*SYNBIOHUB_FAILURES, UnknownTemplateError)
UNEXPECTED_FAILURE = (
    'The template download failed unexpectedly. The details are in the server log.'
)


@dataclass(frozen=True)
class TemplateRequest:
    """A validated /api/downloadTemplate request. Nothing has been fetched yet."""

    template_type: str
    sbh_url: str
    # The web host the study lives under; the lookups also read its public graph.
    sbh_prefix: str
    # Out of the repr, so a request in a log line or traceback carries none.
    sbh_token: str = field(repr=False)
    collection_url: str


def parse_request(files) -> TemplateRequest:
    params = read_params(files, REQUIRED_PARAMS)
    if params['sbh_token'] is None:
        raise ApiError(400, 'No SBH credentials provided')
    return TemplateRequest(
        template_type=params['template_type'],
        sbh_url=sbh_base_url(params),
        sbh_prefix=params['sbh_prefix'],
        sbh_token=params['sbh_token'],
        collection_url=params['collection_url'],
    )


def run(req: TemplateRequest) -> Tuple[BytesIO, str]:
    """The filled template, and the filename to offer it under."""
    try:
        return build_template(
            req.template_type, req.sbh_url, req.sbh_prefix, req.sbh_token,
            req.collection_url,
        )
    except BlockedDestinationError as e:
        raise ApiError(400, str(e)) from e
    except REPORTED_FAILURES as e:
        raise ApiError(500, str(e)) from e
    except Exception:
        logger.exception('Unexpected failure in /api/downloadTemplate')
        raise ApiError(500, UNEXPECTED_FAILURE)
