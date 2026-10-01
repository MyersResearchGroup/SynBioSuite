"""Uniform JSON errors for /api/v1.

Every failure renders as ``{"error": "..."}`` -- the Error schema in the OpenAPI
spec, and the shape route.py already returns from the legacy endpoints.
"""
from flask import current_app, jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    """An error with a deliberate HTTP status, raised from views or context parsing."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def register_error_handlers(bp):
    @bp.errorhandler(ApiError)
    def _handle_api_error(err):
        return jsonify({'error': err.message}), err.status

    @bp.errorhandler(HTTPException)
    def _handle_http_error(err):
        return jsonify({'error': err.description}), err.code

    @bp.errorhandler(Exception)
    def _handle_unexpected(err):
        current_app.logger.exception('Unhandled error in /api/v1')
        return jsonify({'error': str(err)}), 500
