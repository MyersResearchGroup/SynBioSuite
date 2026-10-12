"""Errors shared by both HTTP surfaces: /api/v1 and the legacy /api/* routes."""
import os
from xml.sax import SAXParseException


class ApiError(Exception):
    """An error with a deliberate HTTP status, raised below the route handlers.

    Each surface renders it as ``{"error": message}`` with that status: the
    /api/v1 blueprint in api/errors.py, the legacy routes in route.py.
    """

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def parser_message(error: SAXParseException) -> str:
    """Why and where an XML parse failed, fit to show the caller.

    str(error) leads with the path of the temp file on this server; this
    gives the rest.
    """
    return (
        f'{error.getMessage()} '
        f'(line {error.getLineNumber()}, column {error.getColumnNumber()})'
    )


def without_directory(message: str, directory: str) -> str:
    """`message` with temp files under `directory` called by name alone."""
    return message.replace(directory + os.sep, '')
