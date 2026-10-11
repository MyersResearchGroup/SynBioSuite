"""Request plumbing the legacy /api/* services share.

Each helper raises ApiError with the message these routes have always answered.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Iterable

from ..errors import ApiError
from ..sbh_http import normalise_base_url
from ..utils import get_sbh_user

PARAMS_FIELD = 'Params'

# SynBioHub /submit overwrite_merge values; see MERGE_AND_OVERWRITE in api/sbh.py.
MERGE_AND_OVERWRITE = 3
MERGE_AND_PREVENT = 2


@dataclass(frozen=True)
class SbhUser:
    """Who a SynBioHub token belongs to, as <sbh_url>/profile reports it."""

    name: str
    graph: str


def read_params(files, required: Iterable[str]) -> dict:
    """The request's Params part, parsed, with every `required` key present."""
    if PARAMS_FIELD not in files:
        raise ApiError(400, 'No Params file part')
    params_file = files[PARAMS_FIELD]
    if params_file.filename == '':
        raise ApiError(400, 'No selected Params file')
    params = json.loads(params_file.read())

    for param in required:
        if param not in params:
            raise ApiError(400, f'Parameter {param} not found in request')
    return params


def sbh_base_url(params: dict) -> str:
    """params['sbh_url'] in canonical form.

    Also adds https:// when the scheme is missing, as these routes always have.
    """
    try:
        return normalise_base_url(params.get('sbh_url'))
    except ValueError as error:
        raise ApiError(400, f'Invalid sbh_url: {error}') from error


def overwrite_merge(params: dict) -> int:
    """How /submit should treat objects that already exist: sbh_overwrite, on by default."""
    return MERGE_AND_OVERWRITE if params.get('sbh_overwrite', 1) else MERGE_AND_PREVENT


def login(sbh_url: str, sbh_token: str) -> SbhUser:
    """Ask SynBioHub whose token this is."""
    try:
        profile = get_sbh_user(sbh_url, sbh_token)
        return SbhUser(name=profile['user'], graph=profile['graph'])
    except Exception as error:
        print('Error logging into SynBioHub')
        raise ApiError(400, f'Error logging into SynBioHub: {error}') from error
