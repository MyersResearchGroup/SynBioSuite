"""Uniform JSON errors for /api/v1.

Every failure renders as ``{"error": "..."}`` -- the Error schema in the OpenAPI
spec, and the shape legacy_routes.py already returns from the legacy endpoints.
"""
from flask import current_app, jsonify
from werkzeug.exceptions import HTTPException

# Defined in app/errors.py, which the legacy routes share; the api modules and
# their tests import it from here.
from ..errors import ApiError
from ..sbh_http import BlockedDestinationError

UNEXPECTED_FAILURE = (
    'The request failed unexpectedly. The details are in the server log.'
)


def register_error_handlers(bp):
    @bp.errorhandler(ApiError)
    def _handle_api_error(err):
        return jsonify({'error': err.message}), err.status

    @bp.errorhandler(BlockedDestinationError)
    def _handle_blocked_destination(err):
        # The caller named a SynBioHub URL on a non-public address (review H5).
        return jsonify({'error': str(err)}), 400

    @bp.errorhandler(HTTPException)
    def _handle_http_error(err):
        return jsonify({'error': err.description}), err.code

    @bp.errorhandler(Exception)
    def _handle_unexpected(err):
        # The caller is told only that it failed; the exception goes to the log.
        current_app.logger.exception('Unhandled error in /api/v1')
        return jsonify({'error': UNEXPECTED_FAILURE}), 500
