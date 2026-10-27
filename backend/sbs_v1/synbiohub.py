"""Reading a study's collections from SynBioHub.

Every call goes through http.get, so the public-address guard applies, and
every failure leaves here as an ApiError with the status the caller should see.
"""
import re
from urllib.parse import urlencode

import requests

from . import http
from .errors import ApiError

# sbol:type and sbol:role are multi-valued, so one member can produce several
# rows; list_items() collapses them back into one entry per object.
_ITEM_QUERY = """PREFIX sbol: <http://sbols.org/v2#>
PREFIX dcterms: <http://purl.org/dc/terms/>
SELECT ?s ?id ?name ?description ?type ?role FROM <%s> WHERE {
  <%s> sbol:member ?s .
  ?s sbol:displayId ?id .
  OPTIONAL { ?s dcterms:title ?name }
  OPTIONAL { ?s dcterms:description ?description }
  OPTIONAL { ?s sbol:type ?type }
  OPTIONAL { ?s sbol:role ?role }
}"""

# How much of a failed SynBioHub answer goes into an error message; an error
# page can be a whole HTML document.
ANSWER_CHARS_IN_ERRORS = 200

# Characters that can end an IRI inside <...> and let the rest be read as SPARQL.
_UNSAFE_IRI_CHARS = re.compile(r'[<>"{}|\\^`\s]')


def list_items(ctx, collection_uri):
    """Every member of a collection, shaped as the spec's Item schema."""
    query = _ITEM_QUERY % (_iri(ctx.usergraph), _iri(collection_uri))
    response = _get(ctx, f"{ctx.sbh_url}/sparql?{urlencode({'query': query})}",
                    accept="application/json")
    if not response.ok:
        raise _refused("SynBioHub sparql query failed", response)
    try:
        result = response.json()
    except ValueError:
        raise ApiError(502, "SynBioHub answered the sparql query with something other than JSON")

    items = {}
    for binding in result.get("results", {}).get("bindings", []):
        uri = binding["s"]["value"]
        item = items.setdefault(uri, {
            "uri": uri,
            "displayId": binding.get("id", {}).get("value"),
            "name": binding.get("name", {}).get("value"),
            "description": binding.get("description", {}).get("value"),
            "type": [],
            "role": [],
        })
        for field in ("type", "role"):
            value = binding.get(field, {}).get("value")
            if value and value not in item[field]:
                item[field].append(value)

    return list(items.values())


def study_exists(ctx):
    """Whether the study collection itself is there.

    Only asked when a collection comes back empty, to tell "this collection has
    no members" (200 []) from "this study does not exist" (404).
    """
    response = _get(ctx, f"{http.rebase_uri(ctx.sbh_url, ctx.study_uri)}/metadata",
                    accept="text/plain")
    if response.status_code == 404:
        return False
    if not response.ok:
        raise _refused("SynBioHub could not look up the study", response)

    # SynBioHub answers 200 with an empty JSON array for a collection that does
    # not exist; only the plain URI and /sbol return a real 404, and both of
    # those download the whole document. So the body is the signal here.
    try:
        return bool(response.json())
    except ValueError:
        return True


def _get(ctx, url, accept):
    """http.get with the caller's token, turning transport failures into ApiErrors."""
    try:
        return http.get(url, headers={"Accept": accept, "X-authorization": ctx.token})
    except http.BlockedDestinationError as error:
        raise ApiError(400, str(error))  # the caller's URL is at fault, not SynBioHub
    except requests.Timeout:
        raise ApiError(504, "SynBioHub did not answer in time")
    except requests.RequestException as error:
        # requests' own message repeats the whole URL, query included; the type says enough.
        raise ApiError(502, f"Could not reach SynBioHub at {ctx.sbh_url} ({type(error).__name__})")


def _refused(what, response):
    """A short 502 for a non-OK answer: the status and the start of SynBioHub's text."""
    if response.status_code in (401, 403):
        return ApiError(502, f"SynBioHub refused the token ({response.status_code}); "
                             f"it may have expired")
    return ApiError(502, f"{what} ({response.status_code}): "
                         f"{response.text[:ANSWER_CHARS_IN_ERRORS]}")


def _iri(uri):
    """The URI, if it is safe to put inside <...> in a SPARQL query."""
    if _UNSAFE_IRI_CHARS.search(uri):
        raise ApiError(400, f"Not a usable URI (it has a character not allowed in one): {uri}")
    return uri
