"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def attach_to_assay(display_id, file, body=None):
    """Add a new attachment to the pointed SBOL object"""
    return impl.attach_to_assay(display_id=display_id, file=file, )


def clear_assays():
    """Empty the assays collection"""
    return impl.clear_assays()


def create_assays(file, body=None):
    """Add to the assays collection"""
    return impl.create_assays(file=file, params=(body or {}).get('params'), )


def get_assays_template():
    """Download the blank Excel template for assays"""
    return impl.get_assays_template()


def list_assays():
    """Get all the contents of the assays collection"""
    return impl.list_assays()


def replace_assays(file, body=None):
    """Replace the assays collection contents"""
    return impl.replace_assays(file=file, params=(body or {}).get('params'), )
