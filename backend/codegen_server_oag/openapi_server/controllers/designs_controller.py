"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def clear_designs():
    """Empty the designs collection"""
    return impl.clear_designs()


def create_designs(file, body=None):
    """Add to the designs collection"""
    return impl.create_designs(file=file, params=(body or {}).get('params'), )


def list_designs():
    """Get all the contents of the designs collection"""
    return impl.list_designs()


def replace_designs(file, body=None):
    """Replace the designs collection contents"""
    return impl.replace_designs(file=file, params=(body or {}).get('params'), )
