"""Generated from the OpenAPI spec. Do not edit: regenerating overwrites this file.

Each function forwards to the hand-written implementation of the same name
(see openapi_server/impl.py). Header parameters are not arguments; the
implementation reads them from the request.
"""
from openapi_server import impl


def clear_models():
    """[TBD] Empty the models collection"""
    return impl.clear_models()


def create_models():
    """[TBD] Add to the models collection"""
    return impl.create_models()


def list_models():
    """[TBD] Get all the contents of the models collection"""
    return impl.list_models()


def replace_models():
    """[TBD] Replace the models collection contents"""
    return impl.replace_models()
