"""Refuse an oversized request body before anything buffers it.

Flask's MAX_CONTENT_LENGTH is too late for /api/v1: Connexion validates a
request before Flask sees it, and reads the whole body to do so. This runs
ahead of that. Behind nginx the same limit is enforced earlier still, by
client_max_body_size; this covers every other way of running the application.
"""
from starlette.exceptions import HTTPException

BYTES_PER_MB = 1024 * 1024
TOO_LARGE = 413


class RequestSizeLimitMiddleware:
    """ASGI middleware: 413 for a body over `max_bytes` on paths under `path_prefix`.

    A declared Content-Length over the limit is refused without reading the
    body. A body that is streamed, or longer than it declared, is refused as
    soon as the bytes received pass the limit.
    """

    def __init__(self, app, max_bytes: int, path_prefix: str):
        self.app = app
        self.max_bytes = max_bytes
        self.path_prefix = path_prefix

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or not self._applies_to(scope['path']):
            await self.app(scope, receive, send)
            return

        declared = _content_length(scope)
        if declared is not None and declared > self.max_bytes:
            raise self._too_large()

        received = 0

        async def limited_receive():
            nonlocal received
            message = await receive()
            if message['type'] == 'http.request':
                received += len(message.get('body', b''))
                if received > self.max_bytes:
                    raise self._too_large()
            return message

        await self.app(scope, limited_receive, send)

    def _applies_to(self, path: str) -> bool:
        return path == self.path_prefix or path.startswith(self.path_prefix + '/')

    def _too_large(self) -> HTTPException:
        limit_mb = self.max_bytes / BYTES_PER_MB
        return HTTPException(
            TOO_LARGE, detail=f'The request body is larger than the {limit_mb:g} MB limit',
        )


def _content_length(scope):
    """The declared body size, or None when absent or not a number."""
    for name, value in scope['headers']:
        if name == b'content-length':
            try:
                return int(value)
            except ValueError:
                return None
    return None
