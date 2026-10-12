"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def clear_archives():
    """[TBD] Empty the archives collection"""
    return impl.clear_archives()


def create_archives():
    """[TBD] Add to the archives collection"""
    return impl.create_archives()


def list_archives():
    """[TBD] Get all the contents of the archives collection"""
    return impl.list_archives()


def replace_archives():
    """[TBD] Replace the archives collection contents"""
    return impl.replace_archives()
