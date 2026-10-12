"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def clear_analyses():
    """[TBD] Empty the analyses collection"""
    return impl.clear_analyses()


def create_analyses():
    """[TBD] Add to the analyses collection"""
    return impl.create_analyses()


def list_analyses():
    """[TBD] Get all the contents of the analyses collection"""
    return impl.list_analyses()


def replace_analyses():
    """[TBD] Replace the analyses collection contents"""
    return impl.replace_analyses()
