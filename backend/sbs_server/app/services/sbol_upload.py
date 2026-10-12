"""Upload an SBOL file into a study on SynBioHub, optionally with its SBML model.

Behind POST /api/uploadSBOL.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Optional, Tuple
from xml.sax import SAXParseException

import sbol2
import sbol2.model
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from ..api.registry import homespace_for
from ..errors import ApiError, parser_message
from ..synbiohubUpload import upload_sbh_attachments, upload_to_sbh
from ..utils import (
    find_root_component_definitions,
    find_root_module_definitions,
    make_identifier,
    sbh_get_attachment_uri,
)
from .common import (
    SYNBIOHUB_FAILURES,
    SbhUser,
    Workspace,
    login,
    overwrite_merge,
    read_params,
    sbh_base_url,
    upload_workspace,
)

logger = logging.getLogger(__name__)

REQUIRED_PARAMS = (
    'sbh_url', 'sbh_prefix', 'sbh_token', 'collection_url', 'sbh_overwrite', 'importType',
)

# Failures whose message is fit to show the caller: SynBioHub's, and sbol2
# rejecting the document. Anything else is unexpected; the caller is told only
# that it failed, and the exception goes to the log.
REPORTED_FAILURES = (*SYNBIOHUB_FAILURES, sbol2.SBOLError)
UNEXPECTED_FAILURE = (
    'The SBOL upload failed unexpectedly. The details are in the server log.'
)

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
    # Out of the repr, so a request in a log line or traceback carries none.
    sbh_token: str = field(repr=False)
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
    with upload_workspace() as workspace:
        return _upload(req, user, workspace)


def _upload(req: SbolUploadRequest, user: SbhUser, workspace: Workspace) -> dict:
    safe_sbol_filename = secure_filename(req.sbol_file.filename)
    if safe_sbol_filename == '':
        raise ApiError(400, 'Invalid SBOL file name')
    sbol_path = workspace.path(safe_sbol_filename)
    sbol_out_path = workspace.path(f'out_{safe_sbol_filename}')
    sbml_path = None
    if req.sbml_file is not None:
        safe_sbml_filename = secure_filename(req.sbml_file.filename)
        if safe_sbml_filename == '':
            raise ApiError(400, 'Invalid SBML file name')
        sbml_path = workspace.path(safe_sbml_filename)

    try:
        req.sbol_file.save(sbol_path)
        if req.sbml_file is not None:
            req.sbml_file.save(sbml_path)
        # Process-global in sbol2, like the homespace.
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
        sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
        sbol2.setHomespace(homespace_for(req.import_type))
        doc = _read_document(sbol_path)
        if req.sbml_file is not None:
            attach_sbml_model(doc, req, user)
        top_level = top_level_uri(doc, req.import_type, req.collection_parts)
        sub_collection_url = upload_to_sbh(
            doc, req.sbh_url, req.sbh_prefix, req.sbh_token, req.usergraph,
            req.collection_url, req.import_type, sbol_out_path, req.overwrite_merge,
        )
    except ApiError:
        raise
    except AttributeError as e:
        print('Attribute Error: ', str(e))
        raise ApiError(400, str(e)) from e
    except REPORTED_FAILURES as e:
        # A 500 here, where the XDC routes answer SynBioHub's refusals with 400.
        raise ApiError(500, str(e)) from e
    except Exception:
        logger.exception('Unexpected failure in /api/uploadSBOL')
        raise ApiError(500, UNEXPECTED_FAILURE)

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


def _read_document(path: str) -> sbol2.Document:
    doc = sbol2.Document()
    try:
        doc.read(path)
    except SAXParseException as e:
        raise ApiError(500, f'Could not parse the SBOL file: {parser_message(e)}') from e
    return doc

