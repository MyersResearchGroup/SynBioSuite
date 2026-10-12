"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Connexion calls these to check credentials (x-bearerInfoFunc in the spec).
Each forwards to the hand-written implementation of the same name.
"""
from openapi_server import impl


def info_from_bearerAuth(token):
    """Token information for a bearer token, or None to reject it."""
    return impl.info_from_bearerAuth(token=token)
