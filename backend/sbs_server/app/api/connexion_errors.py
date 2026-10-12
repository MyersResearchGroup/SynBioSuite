"""Uniform errors for the Connexion application.

Under /api/v1 every failure renders as ``{"error": "..."}`` -- the Error schema
in the OpenAPI spec -- with the status it already carries. That covers what
Connexion rejects before a handler runs (validation, security, routing), which
it would otherwise render as application/problem+json.

Outside /api/v1 the legacy routes keep the pages Flask gave them.
"""
import json
import logging

from connexion.exceptions import ProblemException
from connexion.lifecycle import ConnexionResponse
from starlette.exceptions import HTTPException
from starlette.formparsers import MultiPartException
from werkzeug.exceptions import InternalServerError, default_exceptions

from ..sbh_http import BlockedDestinationError
from .errors import UNEXPECTED_FAILURE, ApiError

API_PREFIX = '/api/v1'

logger = logging.getLogger(__name__)


def register(connexion_app):
    connexion_app.add_error_handler(ApiError, _api_error)
    connexion_app.add_error_handler(BlockedDestinationError, _blocked_destination)
    connexion_app.add_error_handler(ProblemException, _problem)
    connexion_app.add_error_handler(HTTPException, _http_error)
    connexion_app.add_error_handler(MultiPartException, _unparseable_form)
    connexion_app.add_error_handler(Exception, _unexpected)


def _api_error(request, error):
    return _error(error.status, error.message)


def _blocked_destination(request, error):
    # The caller named a SynBioHub URL on a non-public address (review H5).
    return _error(400, str(error))


def _problem(request, error):
    """What Connexion itself rejected: validation, security, an unknown path."""
    return _error(error.status, error.detail or error.title)


def _unparseable_form(request, error):
    # Raised while Connexion validates a multipart body it cannot parse.
    return _error(400, error.message)


def _http_error(request, error):
    if not _is_api(request):
        return _flask_page(error.status_code, error.detail)
    return _error(error.status_code, error.detail)


def _unexpected(request, error):
    # The caller is told only that it failed; the exception goes to the log.
    logger.error('Unhandled error in %s', request.url.path, exc_info=error)
    if not _is_api(request):
        return _flask_page(500, None)
    return _error(500, UNEXPECTED_FAILURE)


def _is_api(request) -> bool:
    path = request.url.path
    return path == API_PREFIX or path.startswith(API_PREFIX + '/')


def _error(status: int, message: str) -> ConnexionResponse:
    return ConnexionResponse(
        status_code=status,
        mimetype='application/json',
        body=json.dumps({'error': message}),
    )


def _flask_page(status: int, description) -> ConnexionResponse:
    """The page Flask would have rendered for this status on its own."""
    page = default_exceptions.get(status, InternalServerError)(description).get_response()
    return ConnexionResponse(
        status_code=status,
        content_type=page.content_type,
        body=page.get_data(),
    )
