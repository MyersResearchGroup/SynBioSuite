"""SynBioHub datastore operations for /api/v1.

A thin layer over the helpers the backend already has (synbiohubUpload.py,
utils.py), adapting them to a StudyContext and to this API's error shape.
"""
import os
from urllib.parse import urlparse
from uuid import uuid4

import requests
import sbol2

from ..synbiohubUpload import upload_to_sbh
from ..utils import sbh_get_subCollection_uris, sparql_query
from .errors import ApiError
from .registry import CollectionSpec

# SynBioHub /submit overwrite_merge: 0 prevent, 1 overwrite,
# 2 merge and prevent, 3 merge and overwrite matching URIs.
#
# Only 2 and 3 are usable here. Verified against a live instance: submitting
# with rootCollections set and overwrite_merge=1 is rejected outright
# ("Please enter an id for your submission") -- 0 and 1 belong to the
# create-a-new-collection flow. That is why PUT cannot be a single atomic
# submit and has to clear first; see replace().
MERGE_AND_OVERWRITE = 3


def submit(ctx, spec: CollectionSpec, doc, upload_dir: str,
           overwrite_merge: int = MERGE_AND_OVERWRITE):
    """Submit a document into this study's sub-collection for `spec`."""
    os.makedirs(upload_dir, exist_ok=True)
    out_path = os.path.join(upload_dir, f'{uuid4()}_SBOL_final.xml')

    # upload_to_sbh calls doc.write(), and sbol2 defaults to POSTing the whole
    # document to validator.sbolstandard.org on every write -- then discards the
    # result. Skip that round-trip here; restore the option so the legacy /api/*
    # routes keep whatever behaviour they had. (Process-global, like the other
    # sbol2 config: fine under uwsgi's processes=4, no threads.)
    previous = sbol2.Config.getOption(sbol2.ConfigOptions.VALIDATE)
    sbol2.Config.setOption(sbol2.ConfigOptions.VALIDATE, False)
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
        )
    except ApiError:
        raise
    except Exception as error:
        raise ApiError(502, f'SynBioHub rejected the submission: {error}')
    finally:
        sbol2.Config.setOption(sbol2.ConfigOptions.VALIDATE, previous)
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
    except Exception as error:
        raise ApiError(502, f'Could not query SynBioHub: {error}')

    return [
        {'uri': b['s']['value'], 'displayId': b.get('id', {}).get('value')}
        for b in result.get('results', {}).get('bindings', [])
    ]


def resolve_member(ctx, spec: CollectionSpec, object_id: str) -> str:
    """Find a member of this collection by displayId (or by its full URI)."""
    for member in members(ctx, ctx.subcollection_uri(spec.import_type)):
        uri, display_id = member['uri'], member['displayId']
        if object_id in (display_id, uri) or uri.rstrip('/').endswith(f'/{object_id}'):
            return uri

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
        response = requests.post(
            endpoint, headers=headers, data={'member': member['uri']}
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
    response = requests.post(
        f'{api_url(ctx, object_uri)}/attach',
        headers={'Accept': 'text/plain', 'X-authorization': ctx.token},
        files={'file': (filename, stream)},
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
    path = urlparse(resource_uri).path
    return ctx.sbh_url.rstrip('/') + path


def replace(ctx, spec: CollectionSpec, doc, upload_dir: str):
    """Make the collection contain exactly `doc` -- the PUT operation.

    SynBioHub has no atomic replace (see MERGE_AND_OVERWRITE above) and no
    transactions, so this clears and then submits. Two things keep that from
    being dangerous:

      * the caller validates and converts the upload *before* this runs, so
        every bad-input failure happens while the collection is still intact;
      * if the submit fails anyway, the previous membership is restored. The
        objects were only unlinked, never destroyed, so re-linking them is
        enough to put the collection back.
    """
    collection_uri = ctx.subcollection_uri(spec.import_type)
    previous = [member['uri'] for member in members(ctx, collection_uri)]

    clear_collection(ctx, spec)
    try:
        submit(ctx, spec, doc, upload_dir, MERGE_AND_OVERWRITE)
    except Exception:
        restore_members(ctx, spec, previous, upload_dir)
        raise


def restore_members(ctx, spec: CollectionSpec, member_uris, upload_dir: str):
    """Re-link objects that were unlinked by a replace that then failed.

    Best effort: if this fails too, the original error is what the caller
    reports, with this failure logged alongside it.
    """
    if not member_uris:
        return

    os.makedirs(upload_dir, exist_ok=True)
    path = os.path.join(upload_dir, f'{uuid4()}_restore.xml')
    previous_validate = sbol2.Config.getOption(sbol2.ConfigOptions.VALIDATE)
    sbol2.Config.setOption(sbol2.ConfigOptions.VALIDATE, False)
    try:
        doc = sbol2.Document()
        collection = sbol2.Collection(spec.import_type)
        collection.members = list(member_uris)
        doc.addCollection(collection)
        doc.write(path)

        with open(path, 'rb') as handle:
            response = requests.post(
                f'{ctx.sbh_url}/submit',
                headers={'Accept': 'text/plain', 'X-authorization': ctx.token},
                files={'files': handle},
                data={'rootCollections': ctx.study_uri,
                      'overwrite_merge': MERGE_AND_OVERWRITE},
            )
        if not response.ok:
            print(f'WARNING: could not restore /{spec.path} membership after a '
                  f'failed replace ({response.status_code}): {response.text}')
    except Exception as error:
        print(f'WARNING: could not restore /{spec.path} membership after a '
              f'failed replace: {error}')
    finally:
        sbol2.Config.setOption(sbol2.ConfigOptions.VALIDATE, previous_validate)
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass


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
    response = requests.get(
        f'{api_url(ctx, collection_uri)}/sbol',
        headers={'Accept': 'text/plain', 'X-authorization': ctx.token},
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
    response = requests.get(
        f'{api_url(ctx, ctx.study_uri)}/metadata',
        headers={'Accept': 'text/plain', 'X-authorization': ctx.token},
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
