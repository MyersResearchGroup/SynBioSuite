"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def clear_devices():
    """Empty the devices collection"""
    return impl.clear_devices()


def create_devices(file, body=None):
    """Add to the devices collection"""
    return impl.create_devices(file=file, params=(body or {}).get('params'), )


def list_devices():
    """Get all the contents of the devices collection"""
    return impl.list_devices()


def replace_devices(file, body=None):
    """Replace the devices collection contents"""
    return impl.replace_devices(file=file, params=(body or {}).get('params'), )
