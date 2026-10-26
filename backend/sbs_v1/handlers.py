"""Hand-written logic for the generated /api/v1 controllers.

Every generated controller function calls handle(method, path, **params).
Header values (token, study) are read from the request here, not passed in.
"""

VERSION = "0.0.0-dev"  # placeholder until this is wired into the backend's version

JSON = {"Content-Type": "application/json"}


def handle(method, path, **params):
    """Answer one /api/v1 operation, identified by its method and spec path."""
    print("handle:", method, path, params)  # temporary: shows what arrives

    if (method, path) == ("GET", "/status"):
        return {"status": "working", "version": VERSION}, 200, JSON

    return {"error": f"{method} {path} is not implemented yet"}, 501, JSON