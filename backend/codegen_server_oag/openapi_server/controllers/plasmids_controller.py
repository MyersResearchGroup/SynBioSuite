"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def clear_plasmids():
    """Empty the plasmids collection"""
    return impl.clear_plasmids()


def create_plasmids(file, body=None):
    """Add to the plasmids collection"""
    return impl.create_plasmids(file=file, params=(body or {}).get('params'), )


def list_plasmids():
    """Get all the contents of the plasmids collection"""
    return impl.list_plasmids()


def replace_plasmids(file, body=None):
    """Replace the plasmids collection contents"""
    return impl.replace_plasmids(file=file, params=(body or {}).get('params'), )
