"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def clear_sample_designs():
    """Empty the sample designs collection"""
    return impl.clear_sample_designs()


def create_sample_designs(file, body=None):
    """Add to the sample designs collection"""
    return impl.create_sample_designs(file=file, params=(body or {}).get('params'), )


def get_sample_designs_template():
    """Download the blank Excel template for sample designs"""
    return impl.get_sample_designs_template()


def list_sample_designs():
    """Get all the contents of the sample designs collection"""
    return impl.list_sample_designs()


def replace_sample_designs(file, body=None):
    """Replace the sample designs collection contents"""
    return impl.replace_sample_designs(file=file, params=(body or {}).get('params'), )
