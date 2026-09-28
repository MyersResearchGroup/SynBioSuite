"""SynBioHub datastore operations for /api/v1.

A thin layer over the helpers the backend already has (synbiohubUpload.py,
utils.py), adapting them to a StudyContext and to this API's error shape.
"""
import os
from uuid import uuid4

from .. import sbh_http
from ..sbh_http import BlockedDestinationError, rebase_uri
from ..synbiohubUpload import subcollection_members, upload_to_sbh
from ..utils import (
    SBH_TIMEOUT,
    sbh_get_subCollection_uris,
    sparql_query,
)
from .errors import ApiError
from .registry import CollectionSpec

# SynBioHub /submit overwrite_merge: 0 prevent, 1 overwrite,
# 2 merge and prevent, 3 merge and overwrite matching URIs.
#
# Only 2 and 3 are usable here. Verified against a live instance: submitting
# with rootCollections set and overwrite_merge=1 is rejected outright
# ("Please enter an id for your submission") -- 0 and 1 belong to the
# create-a-new-collection flow.
#
# With 3, an object that already exists with different content is replaced --
# a sub-collection included, so its member list becomes exactly the one
# submitted. Traced in SynBioHub/synbiohub 8d99c34: PrepareSubmissionJob.java
# calls replaceSBOL (line 543), i.e. GET <uri>/replace, which runs
# sparql/remove.sparql and deletes all of the object's triples, sbol:member
# included; submit.js:485 then inserts the new ones. The members are separate
# objects and survive, unlinked. That is why upload_to_sbh re-lists the
# current members for POST, and what lets PUT be one submit (see replace()).
# Two limits of that path:
#   * a failed replace is only logged (lines 544-547) and the submit still
#     answers 200, with old and new members side by side -- replace() checks;
#   * SynBioHub deletes before it inserts, so an abort in between leaves the
#     sub-collection unlinked. Every POST shares that exposure.
MERGE_AND_OVERWRITE = 3

# How many leftover members a failed replace names in its error.
NAMED_IN_ERRORS = 5


def submit(ctx, spec: CollectionSpec, doc, upload_dir: str,
           overwrite_merge: int = MERGE_AND_OVERWRITE,
           replace_members: bool = False):
    """Submit a document into this study's sub-collection for `spec`.

    The sub-collection keeps its members and gains the document's objects --
    or, with replace_members, lists only the document's objects, and
    SynBioHub's overwrite unlinks the rest.
    """
    os.makedirs(upload_dir, exist_ok=True)
    out_path = os.path.join(upload_dir, f'{uuid4()}_SBOL_final.xml')

    # upload_to_sbh writes the document with sbol2's validator off
    # (utils.sbol_validation_disabled), so nothing goes to a third party.
    try:
        upload_to_sbh(
            doc,
            ctx.sbh_url,
            ctx.sbh_prefix,
            ctx.token,
            ctx.usergraph,
            ctx.study_uri,
            spec.import_type,
            out_path,
            overwrite_merge,
            replace_members=replace_members,
        )
    except (ApiError, BlockedDestinationError):
        raise
    except Exception as error:
        raise ApiError(502, f'SynBioHub rejected the submission: {error}')
    finally:
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
        except OSError as cleanup_error:
            print(f'Warning: failed to remove {out_path}: {cleanup_error}')


def members(ctx, collection_uri: str):
    """Every member of a collection, as {uri, displayId}.

    An absent sub-collection simply has no members -- that is a 200 with an
    empty list, not a 404.
    """
    try:
        result = sbh_get_subCollection_uris(
            ctx.sbh_url, ctx.token, ctx.usergraph, collection_uri
        )
    except BlockedDestinationError:
        raise  # the caller's URL is at fault, not SynBioHub: errors.py makes it a 400
    except Exception as error:
        raise ApiError(502, f'Could not query SynBioHub: {error}')

    return [
        {'uri': b['s']['value'], 'displayId': b.get('id', {}).get('value')}
        for b in result.get('results', {}).get('bindings', [])
    ]


def resolve_member(ctx, spec: CollectionSpec, object_id: str) -> str:
    """Find a member of this collection by its displayId.

    displayId only. Every SynBioHub URI ends in a version segment, so matching
    on the URI's tail let object_id "1" resolve to whichever member came back
    first. A full URI never reaches here anyway: Flask's default route converter
    rejects the slashes in it.
    """
    for member in members(ctx, ctx.subcollection_uri(spec.import_type)):
        if member['displayId'] == object_id:
            return member['uri']

    raise ApiError(404, f'No object "{object_id}" in /{spec.path} for this study')


def clear_collection(ctx, spec: CollectionSpec) -> int:
    """Empty a collection, returning how many members were removed.

    Uses SynBioHub's removeMembership, which unlinks a member and leaves the
    object itself in place -- verified against a live instance. So this is
    reversible by re-submitting, and it never destroys anyone's SBOL objects.
    Contrast <uri>/remove, which deletes the object and references to it.
    """
    collection_uri = ctx.subcollection_uri(spec.import_type)
    endpoint = f'{api_url(ctx, collection_uri)}/removeMembership'
    headers = {'Accept': 'text/plain', 'X-authorization': ctx.token}

    removed = 0
    for member in members(ctx, collection_uri):
        response = sbh_http.post(
            endpoint, headers=headers, data={'member': member['uri']},
            timeout=SBH_TIMEOUT,
        )
        if not response.ok:
            raise ApiError(
                502,
                f'Removing {member["uri"]} from /{spec.path} failed '
                f'({response.status_code}): {response.text}',
            )
        removed += 1
    return removed


def attach(ctx, object_uri: str, file_storage):
    """Add an attachment to one SBOL object -- SynBioHub's POST <URI>/attach."""
    filename = (getattr(file_storage, 'filename', '') or '').strip()
    if not filename:
        raise ApiError(400, 'No file was uploaded')

    stream = getattr(file_storage, 'stream', None) or file_storage
    response = sbh_http.post(
        f'{api_url(ctx, object_uri)}/attach',
        headers={'Accept': 'text/plain', 'X-authorization': ctx.token},
        files={'file': (filename, stream)},
        timeout=SBH_TIMEOUT,
    )
    if not response.ok:
        raise ApiError(
            502,
            f'Attaching to SynBioHub failed ({response.status_code}): {response.text}',
        )
    return filename


def api_url(ctx, resource_uri: str) -> str:
    """Re-point a resource URI at the configured SynBioHub API base.

    SPARQL returns web URIs (https://synbiohub.org/user/...), but requests have
    to go to the API host (https://api.synbiohub.org/user/...) -- the same
    translation upload_sbh_attachments does by rebuilding the path from sbh_url.
    """
    return rebase_uri(ctx.sbh_url, resource_uri)


def replace(ctx, spec: CollectionSpec, doc, upload_dir: str):
    """Make the collection contain exactly `doc` -- the PUT operation.

    One submit whose sub-collection lists only `doc`'s objects. SynBioHub's
    overwrite replaces the member list (see MERGE_AND_OVERWRITE), so the
    previous members are unlinked -- never destroyed -- by that same request.
    Nothing is cleared beforehand, so a submit SynBioHub rejects leaves the
    collection as it was and there is nothing to roll back.
    """
    uploaded = [tl.displayId for tl in subcollection_members(doc, ctx.sbh_prefix)]
    submit(ctx, spec, doc, upload_dir, MERGE_AND_OVERWRITE, replace_members=True)
    _require_replaced(ctx, spec, uploaded)


# Every sbol:member link, whether or not the member has a displayId -- the
# count after a PUT must not skip one. (members() requires a displayId.)
_MEMBER_LINK_QUERY = """PREFIX sbol: <http://sbols.org/v2#>
SELECT ?s ?id FROM <%s> WHERE {
  <%s> sbol:member ?s .
  OPTIONAL { ?s sbol:displayId ?id }
}"""


def _require_replaced(ctx, spec: CollectionSpec, uploaded):
    """Fail if SynBioHub kept members the submit should have replaced.

    SynBioHub only logs a failed replace and still answers 200, leaving old and
    new members side by side. Nothing is unlinked here: a retried PUT submits
    the same list, and SynBioHub attempts the replace again.
    """
    query = _MEMBER_LINK_QUERY % (ctx.usergraph, ctx.subcollection_uri(spec.import_type))
    try:
        result = sparql_query(ctx.sbh_url, ctx.token, query)
    except BlockedDestinationError:
        raise
    except Exception as error:
        raise ApiError(
            502,
            f'The upload to /{spec.path} was submitted, but the result could not '
            f'be verified ({error})',
        ) from error

    # One entry per member link, keyed by URI: a member with no displayId
    # still counts, and its URI stands in for the name.
    found = {
        b['s']['value']: b.get('id', {}).get('value')
        for b in result.get('results', {}).get('bindings', [])
    }
    extra = len(found) - len(uploaded)
    if extra <= 0:
        return

    uploaded_ids = set(uploaded)
    kept = [name or uri for uri, name in found.items() if name not in uploaded_ids]
    named = ', '.join(kept[:NAMED_IN_ERRORS])
    if len(kept) > NAMED_IN_ERRORS:
        named += ', ...'
    detail = f' ({named})' if kept else ''
    raise ApiError(
        502,
        f'SynBioHub stored the upload, but /{spec.path} still lists {extra} '
        f'member(s) it should have replaced{detail}. Retry the PUT to replace them.',
    )


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


def list_items(ctx, collection_uri: str):
    """Every member of a collection, shaped as the spec's Item schema."""
    try:
        result = sparql_query(
            ctx.sbh_url, ctx.token, _ITEM_QUERY % (ctx.usergraph, collection_uri)
        )
    except BlockedDestinationError:
        raise  # a 400 via errors.py, not a 502
    except Exception as error:
        raise ApiError(502, f'Could not query SynBioHub: {error}')

    items = {}
    for binding in result.get('results', {}).get('bindings', []):
        uri = binding['s']['value']
        item = items.setdefault(uri, {
            'uri': uri,
            'displayId': binding.get('id', {}).get('value'),
            'name': binding.get('name', {}).get('value'),
            'description': binding.get('description', {}).get('value'),
            'type': [],
            'role': [],
        })
        for field in ('type', 'role'):
            value = binding.get(field, {}).get('value')
            if value and value not in item[field]:
                item[field].append(value)

    return list(items.values())


# What an absent sub-collection returns for Accept: application/rdf+xml. The
# JSON branch answers an empty array there, so RDF has to answer an empty SBOL
# document -- a zero-byte body is not XML and every parser rejects it.
EMPTY_SBOL_DOCUMENT = (
    b'<?xml version="1.0" encoding="utf-8"?>\n'
    b'<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n'
    b'         xmlns:sbol="http://sbols.org/v2#"/>\n'
)


def fetch_collection_sbol(ctx, collection_uri: str) -> bytes:
    """The collection as an SBOL document -- SynBioHub's GET <URI>/sbol."""
    response = sbh_http.get(
        f'{api_url(ctx, collection_uri)}/sbol',
        headers={'Accept': 'text/plain', 'X-authorization': ctx.token},
        timeout=SBH_TIMEOUT,
    )
    if response.status_code == 404:
        return b''
    if not response.ok:
        raise ApiError(
            502,
            f'Could not fetch SBOL from SynBioHub ({response.status_code}): '
            f'{response.text}',
        )
    return response.content


def study_exists(ctx) -> bool:
    """Whether the study collection itself is there.

    Only consulted when a collection comes back empty, to tell "this collection
    has no members" (200 []) from "this study does not exist" (404).
    """
    response = sbh_http.get(
        f'{api_url(ctx, ctx.study_uri)}/metadata',
        headers={'Accept': 'text/plain', 'X-authorization': ctx.token},
        timeout=SBH_TIMEOUT,
    )
    if response.status_code == 404:
        return False
    if not response.ok:
        raise ApiError(
            502,
            f'Could not reach SynBioHub ({response.status_code}): {response.text}',
        )

    # SynBioHub answers 200 with an empty JSON array for a collection that does
    # not exist -- only the plain URI and /sbol return a real 404, and both of
    # those download the whole document. So the body is the signal here.
    try:
        return bool(response.json())
    except ValueError:
        return True
