"""The one error type the handlers raise. handle() turns it into {"error": ...}."""


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message