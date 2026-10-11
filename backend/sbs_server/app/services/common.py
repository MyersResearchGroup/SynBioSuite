"""Request plumbing the legacy /api/* services share.

Each helper raises ApiError with the message the routes answer.
"""
from __future__ import annotations

import json
import os
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterable, Iterator, List
from uuid import uuid4

from requests.exceptions import RequestException

from ..errors import ApiError
from ..sbh_http import BlockedDestinationError, SynBioHubError, normalise_base_url
from ..utils import get_sbh_user

PARAMS_FIELD = 'Params'

# Failures talking to SynBioHub whose message is fit to show the caller: it
# said no, it could not be reached, or it was refused as a destination.
SYNBIOHUB_FAILURES = (SynBioHubError, RequestException, BlockedDestinationError)

# SynBioHub /submit overwrite_merge values; see MERGE_AND_OVERWRITE in api/sbh.py.
MERGE_AND_OVERWRITE = 3
MERGE_AND_PREVENT = 2

# Under the process CWD; api/views.py uses the same directory.
UPLOADS_DIRECTORY = 'uploads'


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
    try:
        params = json.loads(params_file.read())
    except ValueError as error:
        raise ApiError(400, 'Params is not valid JSON') from error

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


class Workspace:
    """Where one request keeps its temp files."""

    def __init__(self, directory: str):
        self.directory = directory
        self._paths: List[str] = []

    def path(self, name: str) -> str:
        """A fresh path for a temp file called `name`. Nothing is created yet."""
        path = os.path.join(self.directory, f'{uuid4()}_{name}')
        self._paths.append(path)
        return path

    def remove_files(self) -> None:
        for path in self._paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except OSError as error:
                # Not worth failing a request over: say so and carry on.
                print(f'Warning: failed to remove temporary file {path}: {error}')


@contextmanager
def upload_workspace() -> Iterator[Workspace]:
    """Temp file paths under uploads/, each removed on the way out.

    However the block ends: with a result, an ApiError, or anything else.
    """
    directory = os.path.join(os.getcwd(), UPLOADS_DIRECTORY)
    os.makedirs(directory, exist_ok=True)
    workspace = Workspace(directory)
    try:
        yield workspace
    finally:
        workspace.remove_files()


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
