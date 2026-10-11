"""Hand out a blank Excel template with its lookup sheets filled from a study.

Behind POST /api/downloadTemplate. downloadTemplates.build_template does the
work, and GET /api/v1/{collection}/template shares it.
"""
from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Tuple

from ..downloadTemplates import build_template
from ..errors import ApiError
from ..sbh_http import BlockedDestinationError
from .common import read_params, sbh_base_url

REQUIRED_PARAMS = ('template_type', 'sbh_url', 'sbh_token', 'collection_url')


@dataclass(frozen=True)
class TemplateRequest:
    """A validated /api/downloadTemplate request. Nothing has been fetched yet."""

    template_type: str
    sbh_url: str
    sbh_token: str
    collection_url: str


def parse_request(files) -> TemplateRequest:
    params = read_params(files, REQUIRED_PARAMS)
    if params['sbh_token'] is None:
        raise ApiError(400, 'No SBH credentials provided')
    return TemplateRequest(
        template_type=params['template_type'],
        sbh_url=sbh_base_url(params),
        sbh_token=params['sbh_token'],
        collection_url=params['collection_url'],
    )


def run(req: TemplateRequest) -> Tuple[BytesIO, str]:
    """The filled template, and the filename to offer it under."""
    try:
        return build_template(
            req.template_type, req.sbh_url, req.sbh_token, req.collection_url,
        )
    except BlockedDestinationError as e:
        raise ApiError(400, str(e)) from e
    except Exception as e:
        raise ApiError(500, str(e)) from e
