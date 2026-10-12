"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def clear_strains():
    """Empty the strains collection"""
    return impl.clear_strains()


def create_strains(file, body=None):
    """Add to the strains collection"""
    return impl.create_strains(file=file, params=(body or {}).get('params'), )


def get_strains_template():
    """Download the blank Excel template for strains"""
    return impl.get_strains_template()


def list_strains():
    """Get all the contents of the strains collection"""
    return impl.list_strains()


def replace_strains(file, body=None):
    """Replace the strains collection contents"""
    return impl.replace_strains(file=file, params=(body or {}).get('params'), )
