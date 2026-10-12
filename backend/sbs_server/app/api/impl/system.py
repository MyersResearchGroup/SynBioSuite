"""Operations and checks that do not belong to a collection."""
from ...version import __version__


def get_status():
    """Liveness check. Unauthenticated, per the spec."""
    return {'status': 'working', 'version': __version__}, 200


def info_from_bearerAuth(token):
    """Accept any bearer token that was actually sent.

    Only SynBioHub can say whether a token is valid, and it says so when the
    token is forwarded. Returning None makes Connexion answer 401.
    """
    if not token or not token.strip():
        return None
    return {'token': token.strip()}
