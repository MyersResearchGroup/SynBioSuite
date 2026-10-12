"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def clear_resources():
    """Empty the resources collection"""
    return impl.clear_resources()


def create_resources(file, body=None):
    """Add to the resources collection"""
    return impl.create_resources(file=file, params=(body or {}).get('params'), )


def get_resources_template():
    """Download the blank Excel template for resources"""
    return impl.get_resources_template()


def list_resources():
    """Get all the contents of the resources collection"""
    return impl.list_resources()


def replace_resources(file, body=None):
    """Replace the resources collection contents"""
    return impl.replace_resources(file=file, params=(body or {}).get('params'), )
