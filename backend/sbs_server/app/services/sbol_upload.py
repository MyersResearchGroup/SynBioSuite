"""Upload an SBOL file into a study on SynBioHub, optionally with its SBML model.

Behind POST /api/uploadSBOL.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Tuple
from uuid import uuid4

import sbol2
import sbol2.model
from flask import Response, abort, jsonify
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from ..errors import ApiError
from ..synbiohubUpload import upload_sbh_attachments, upload_to_sbh
from ..utils import (
    find_root_component_definitions,
    find_root_module_definitions,
    make_identifier,
    sbh_get_attachment_uri,
)
from .common import SbhUser, login, overwrite_merge, read_params, sbh_base_url

REQUIRED_PARAMS = ('sbh_url', 'sbh_prefix', 'sbh_token', 'collection_url', 'sbh_overwrite')

# Mirrored by the homespaces in api/registry.py, so an object lands on the same
# URI whichever API uploads it.
HOMESPACES = {
    'Devices': 'https://example.com/',
    'Designs': 'https://sbolcanvas.org/',
    'Models': 'https://sbolcanvas.org/',
    'Plasmids': 'https://example.com/',
}
DEFAULT_HOMESPACE = 'https://synbiosuite.org/'

# Import types whose upload is named after its root object, by that root's kind.
COMPONENT_ROOTED = ('Devices', 'Plasmids')
MODULE_ROOTED = ('Designs',)

# A collection URL split on '/':
#   https: / '' / <host> / user / <user> / <studyId> / <displayId> / <version>
GRAPH_PARTS = 5
STUDY_PARTS = 6
VERSION_PART = 7

SBML_LANGUAGE = 'http://identifiers.org/edam/format_2585'
CONTINUOUS_FRAMEWORK = 'http://identifiers.org/biomodels.sbo/SBO:0000062'


@dataclass(frozen=True)
class SbolUploadRequest:
    """A validated /api/uploadSBOL request. Nothing has been sent or saved yet."""

    sbol_file: FileStorage
    sbml_file: Optional[FileStorage]
    sbh_url: str
    sbh_prefix: Optional[str]
    sbh_token: str
    collection_url: str
    overwrite_merge: int
    import_type: str
    collection_parts: Tuple[str, ...]
    usergraph: str


def parse_request(files) -> SbolUploadRequest:
    if 'SBOL' not in files:
        raise ApiError(400, 'No SBOL file provided')
    sbol_file = files['SBOL']
    sbml_file = files['SBML'] if 'SBML' in files else None

    if not (sbol_file and sbol_file.filename != ''):
        raise ApiError(400, 'No selected file')
    extension = os.path.splitext(sbol_file.filename)[1]
    if not extension == '.xml':
        raise ApiError(400, 'Invalid file format')

    params = read_params(files, REQUIRED_PARAMS)
    if params['sbh_token'] is None:
        raise ApiError(400, 'No SBH credentials provided')
    sbh_url = sbh_base_url(params)
    collection_url = params['collection_url']
    # Not in REQUIRED_PARAMS, so a request without it is an unhandled KeyError.
    import_type = params['importType']
    parts = tuple(collection_url.split('/'))

    return SbolUploadRequest(
        sbol_file=sbol_file,
        # An SBML part with no filename is no SBML file.
        sbml_file=sbml_file if sbml_file and sbml_file.filename != '' else None,
        sbh_url=sbh_url,
        sbh_prefix=params.get('sbh_prefix'),
        sbh_token=params['sbh_token'],
        collection_url=collection_url,
        overwrite_merge=overwrite_merge(params),
        import_type=import_type,
        collection_parts=parts,
        usergraph='/'.join(parts[:GRAPH_PARTS]),
    )


def run(req: SbolUploadRequest) -> dict:
    user = login(req.sbh_url, req.sbh_token)

    upload_dir = os.path.join(os.getcwd(), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    safe_sbol_filename = secure_filename(req.sbol_file.filename)
    if safe_sbol_filename == '':
        raise ApiError(400, 'Invalid SBOL file name')
    sbol_path = os.path.join(upload_dir, f'{uuid4()}_{safe_sbol_filename}')
    sbol_out_path = os.path.join(upload_dir, f'{uuid4()}_out_{safe_sbol_filename}')
    sbml_path = None
    if req.sbml_file is not None:
        safe_sbml_filename = secure_filename(req.sbml_file.filename)
        if safe_sbml_filename == '':
            # Transitional: this route's one error that is not JSON, kept as
            # it was while the code moved.
            abort(Response('Invalid SBML file name', status=400))
        sbml_path = os.path.join(upload_dir, f'{uuid4()}_{safe_sbml_filename}')

    try:
        req.sbol_file.save(sbol_path)
        if req.sbml_file is not None:
            req.sbml_file.save(sbml_path)
        # Process-global in sbol2, like the homespace.
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
        sbol2.setHomespace(HOMESPACES.get(req.import_type, DEFAULT_HOMESPACE))
        doc = sbol2.Document()
        doc.read(sbol_path)
        if req.sbml_file is not None:
            attach_sbml_model(doc, req, user)
        top_level = top_level_uri(doc, req.import_type, req.collection_parts)
        sub_collection_url = upload_to_sbh(
            doc, req.sbh_url, req.sbh_prefix, req.sbh_token, req.usergraph,
            req.collection_url, req.import_type, sbol_out_path, req.overwrite_merge,
        )
    except AttributeError as e:
        print('Attribute Error: ', str(e))
        raise ApiError(400, str(e))
    except Exception as e:
        # Transitional: the body this route has always answered, kept as it
        # was while the code moved.
        abort(_exception_response(e))
    finally:
        _remove_temp_files(sbol_path, sbol_out_path, sbml_path)

    return {
        'sbh_url': req.sbh_url,
        'subCollectionUrl': top_level if top_level is not None else sub_collection_url,
        'status': 'success',
    }


def attach_sbml_model(doc: sbol2.Document, req: SbolUploadRequest, user: SbhUser) -> None:
    """Attach the SBML file to the study and link it into `doc` as a Model.

    The attachment and its lookup use the login graph; the submit that follows
    uses req.usergraph.
    """
    sbml_file = req.sbml_file
    sbml_file.stream.seek(0)
    upload_sbh_attachments(
        req.sbh_url, req.sbh_prefix, req.sbh_token, user.name, user.graph,
        req.collection_url, {sbml_file.filename: sbml_file},
    )
    search_result = sbh_get_attachment_uri(
        req.sbh_url, req.sbh_token, user.graph, req.collection_url, sbml_file.filename,
    )
    # Unbound if the lookup finds nothing: the file is attached by now, and the
    # caller answers a 500.
    for binding in search_result["results"]["bindings"]:
        sourceUri = binding["s"]["value"]

    model = sbol2.model.Model(uri=make_identifier(sbml_file.filename))
    model.source = sourceUri
    model.language = SBML_LANGUAGE
    model.framework = CONTINUOUS_FRAMEWORK
    model.attachments = model.attachments + [sourceUri]
    doc.addModel(model)
    for root in find_root_module_definitions(doc):
        root.models = root.models + [model.identity]


def top_level_uri(doc: sbol2.Document, import_type: str,
                  collection_parts: Tuple[str, ...]) -> Optional[str]:
    """Where SynBioHub will put the document's root object, if it has one to name.

    None for an import type that is not named after a root, and for a document
    with no root of the kind its type looks for. With several, the last wins.
    """
    if import_type in COMPONENT_ROOTED:
        roots = find_root_component_definitions(doc)
    elif import_type in MODULE_ROOTED:
        roots = find_root_module_definitions(doc)
    else:
        return None

    uri = None
    for root in roots:
        uri = '/'.join([
            *collection_parts[:STUDY_PARTS], root.displayId, collection_parts[VERSION_PART],
        ])
    return uri


def _exception_response(error: Exception) -> Response:
    response = jsonify({
        "error": str(error),
        "type": type(error).__name__,
        "repr": repr(error),
    })
    response.status_code = 500
    return response


def _remove_temp_files(sbol_path: str, sbol_out_path: str, sbml_path: Optional[str]) -> None:
    if sbol_path is not None and os.path.exists(sbol_path):
        _remove_each(sbol_path, sbol_out_path)
    if sbml_path is not None and os.path.exists(sbml_path):
        _remove_each(sbml_path, sbol_out_path)


def _remove_each(*paths: str) -> None:
    for path in paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as cleanup_error:
            print(f"Warning: failed to remove temporary file {path}: {cleanup_error}")
