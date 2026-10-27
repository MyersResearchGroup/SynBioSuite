"""Hand-written logic for the generated /api/v1 controllers.

Every generated controller function calls handle(method, path, **params).
Header values (token, study) are read from the request here, not passed in.
"""
from flask import request

from . import request_context, synbiohub
from .config import COLLECTIONS, collection_name
from .errors import ApiError

VERSION = "0.0.0-dev"  # placeholder until this is wired into the backend's version

JSON = {"Content-Type": "application/json"}


def handle(method, path, **params):
    """Answer one /api/v1 operation, identified by its method and spec path."""
    try:
        return _handle(method, path, **params)
    except ApiError as error:
        return {"error": error.message}, error.status, JSON


def _handle(method, path, **params):
    if (method, path) == ("GET", "/status"):
        return {"status": "working", "version": VERSION}, 200, JSON

    name = collection_name(path)
    collection = COLLECTIONS[name]
    if not collection["implemented"]:
        raise ApiError(501, f"/{name} is not specified yet")

    ctx = request_context.from_request()

    if (method, path) == ("GET", f"/{name}"):
        return _list_collection(ctx, collection), 200, JSON

    # Temporary: show what was worked out from the headers. Never include ctx.token.
    return {"error": f"{method} {path} is not implemented yet",
            "study_uri": ctx.study_uri,
            "sbh_url": ctx.sbh_url,
            "usergraph": ctx.usergraph,
            "subcollection": ctx.subcollection_uri(collection["import_type"])}, 501, JSON


def _list_collection(ctx, collection):
    """GET /<collection>: the study's sub-collection, as a list of Items.

    An empty list is only a 404 when the study itself is missing. That is
    checked only when the list is empty, so a populated collection costs one
    SynBioHub query.
    """
    if _wants_rdf():
        raise ApiError(501, "Accept: application/rdf+xml is not implemented yet")

    items = synbiohub.list_items(ctx, ctx.subcollection_uri(collection["import_type"]))
    if not items and not synbiohub.study_exists(ctx):
        raise ApiError(404, f"No study collection at {ctx.study_uri}")
    return items


def _wants_rdf():
    """True only when the client explicitly asked for RDF; */* still gets JSON."""
    return request.accept_mimetypes.best_match(
        ["application/json", "application/rdf+xml"], default="application/json"
    ) == "application/rdf+xml"