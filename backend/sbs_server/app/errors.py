"""Errors shared by both HTTP surfaces: /api/v1 and the legacy /api/* routes."""


class ApiError(Exception):
    """An error with a deliberate HTTP status, raised below the route handlers.

    Each surface renders it as ``{"error": message}`` with that status: the
    /api/v1 blueprint in api/errors.py, the legacy routes in route.py.
    """

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message
