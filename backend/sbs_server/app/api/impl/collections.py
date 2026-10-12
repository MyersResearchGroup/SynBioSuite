"""Collection operations: one implementation per verb, bound to each collection."""
from functools import partial

import connexion
from flask import Response
from werkzeug.datastructures import MIMEAccept
from werkzeug.http import parse_accept_header

from .. import sbh
from ..context import StudyContext
from ..errors import ApiError
from ..registry import COLLECTIONS, CollectionSpec

JSON = 'application/json'
RDF = 'application/rdf+xml'


def list_collection(spec: CollectionSpec):
    """All contents of the collection.

    JSON by default; `Accept: application/rdf+xml` returns the sub-collection's
    SBOL instead. A collection with no members is an empty result, not a 404 --
    only a study that does not exist is a 404.
    """
    # Reads Authorization, X-Study-Collection and X-SynBioHub-Url. It does so
    # through flask.request, which under Connexion's FlaskApp is this request.
    ctx = StudyContext.from_request()
    collection_uri = ctx.subcollection_uri(spec.import_type)

    if _wants_rdf():
        body = sbh.fetch_collection_sbol(ctx, collection_uri)
        if not body:
            _require_study(ctx)
            body = sbh.EMPTY_SBOL_DOCUMENT
        return Response(body, mimetype=RDF)

    items = sbh.list_items(ctx, collection_uri)
    if not items:
        _require_study(ctx)
    # The operation documents two response types, so Connexion refuses a
    # response that does not say which one it is.
    return items, 200, {'Content-Type': JSON}


def _wants_rdf() -> bool:
    """True only when the client explicitly asked for RDF.

    A bare Accept: */* picks the first offer, so JSON stays the default.
    """
    accept = parse_accept_header(connexion.request.headers.get('Accept'), MIMEAccept)
    return accept.best_match([JSON, RDF], default=JSON) == RDF


def _require_study(ctx: StudyContext):
    """404 unless the study collection itself exists."""
    if not sbh.study_exists(ctx):
        raise ApiError(404, f'No study collection at {ctx.study_uri}')


list_strains = partial(list_collection, COLLECTIONS['strains'])
