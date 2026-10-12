"""Hand-written implementations of the /api/v1 operations.

The generated controllers (backend/codegen_server_oag) forward each operation
to the function of the same name in this package; connexion_app.py binds the
two together. An operation with no function here yet answers 501, as do the
collections that are not specified yet.
"""
from ..errors import ApiError
from .collections import UNSPECIFIED_OPERATIONS, list_strains
from .system import get_status, info_from_bearerAuth

__all__ = ['get_status', 'info_from_bearerAuth', 'list_strains']


def __getattr__(name):
    if name.startswith('_'):
        raise AttributeError(name)
    if name in UNSPECIFIED_OPERATIONS:
        return UNSPECIFIED_OPERATIONS[name]

    def not_implemented(**_arguments):
        raise ApiError(501, f'{name} is not implemented yet')

    return not_implemented
