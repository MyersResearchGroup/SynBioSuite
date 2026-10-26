"""Hand-written logic for the generated /api/v1 controllers.

Every generated controller function calls handle(method, path, **params).
Header values (token, study) are read from the request here, not passed in.
"""
from .config import COLLECTIONS, collection_name

VERSION = "0.0.0-dev"  # placeholder until this is wired into the backend's version

JSON = {"Content-Type": "application/json"}


def handle(method, path, **params):
    """Answer one /api/v1 operation, identified by its method and spec path."""
    if (method, path) == ("GET", "/status"):
        return {"status": "working", "version": VERSION}, 200, JSON

    name = collection_name(path)
    collection = COLLECTIONS[name]

    if not collection["implemented"]:
        return {"error": f"/{name} is not specified yet"}, 501, JSON

    # Temporary: show what was looked up, to check the settings work.
    return {"error": f"{method} {path} is not implemented yet",
            "collection": name, "settings": collection}, 501, JSON