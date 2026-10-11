"""Experimental Data Converter (XDC): an Excel workbook to SBOL, uploaded to
SynBioHub with its attachments, and its plate reader output on to Flapjack.

Behind POST /api/uploadResource and POST /api/uploadExperiment.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import sbol2
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from ..api.registry import EXCEL_HOMESPACE
from ..errors import ApiError
from ..synbiohubUpload import upload_sbh_attachments, upload_to_sbh
from ..utils import convert_to_sbol
from . import flapjack_push
from .common import (
    SbhUser,
    Workspace,
    login,
    overwrite_merge,
    read_params,
    sbh_base_url,
    upload_workspace,
)

REQUIRED_PARAMS = (
    'sbh_url', 'sbh_prefix', 'sbh_token', 'fj_url', 'fj_token', 'collection_url',
    'fj_study_id', 'sbh_overwrite', 'fj_overwrite', 'importType',
)
WORKBOOK_EXTENSIONS = ('.xlsx', '.xlsm')


@dataclass(frozen=True)
class TitledFiles:
    """Extra files of one kind, and the Params map that titles each by filename."""

    files: Tuple[FileStorage, ...]
    titles: Dict[str, str]


@dataclass(frozen=True)
class XdcRequest:
    """A validated XDC request. Nothing has been sent or saved yet."""

    metadata_file: FileStorage
    sbh_url: str
    sbh_prefix: Optional[str]
    # May be '': that is only noticed after the conversion.
    sbh_token: str
    collection_url: str
    overwrite_merge: int
    import_type: str
    fj_url: Optional[str]
    fj_token: Optional[str]
    fj_refresh_token: Optional[str]
    fj_study_id: Optional[object]
    attachments: Optional[TitledFiles]
    plate_reader_outputs: Optional[TitledFiles]


def parse_request(files) -> XdcRequest:
    print("Starting XDC run")

    if 'Metadata' not in files:
        raise ApiError(400, 'No file part')
    metadata_file = files['Metadata']
    filename = (metadata_file.filename or '').strip()
    if not filename:
        raise ApiError(400, 'No Metadata file')
    if os.path.splitext(filename)[1].lower() not in WORKBOOK_EXTENSIONS:
        raise ApiError(400, 'Invalid Metadata file format')

    params = read_params(files, REQUIRED_PARAMS)
    sbh_url = sbh_base_url(params)
    if params['sbh_token'] is None:
        raise ApiError(400, 'No SynBioHub credentials provided')
    fj_url = params.get('fj_url')
    fj_token = params.get('fj_token')
    if fj_url and not fj_token:
        raise ApiError(
            400, 'Flapjack URL was provided, but no Flapjack credentials were provided',
        )

    return XdcRequest(
        metadata_file=metadata_file,
        sbh_url=sbh_url,
        sbh_prefix=params.get('sbh_prefix'),
        sbh_token=params.get('sbh_token'),
        collection_url=params.get('collection_url'),
        overwrite_merge=overwrite_merge(params),
        import_type=params.get('importType'),
        fj_url=fj_url,
        fj_token=fj_token,
        fj_refresh_token=params.get('fj_refresh_token'),
        fj_study_id=params.get('fj_study_id'),
        attachments=_titled_files(files, 'Attachments', params, 'attachments'),
        plate_reader_outputs=_titled_files(
            files, 'Plate_Reader_Output', params, 'plateReaderOutputs',
        ),
    )


def run(req: XdcRequest) -> dict:
    with upload_workspace() as workspace:
        return _run(req, workspace)


def _run(req: XdcRequest, workspace: Workspace) -> dict:
    safe_metadata_filename = secure_filename(req.metadata_file.filename)
    if safe_metadata_filename == '':
        raise ApiError(400, 'Invalid Metadata file name')
    metadata_path = workspace.path(safe_metadata_filename)
    req.metadata_file.save(metadata_path)

    # Checked only now, with the workbook already on disk.
    attachments = _by_title(req.attachments, 'Attachment')
    plate_reader_attachments = _by_title(req.plate_reader_outputs, 'Plate Reader Output')

    try:
        sbol_doc = convert_to_sbol(
            metadata_path, workspace.path('converted_SBOL.xml'), EXCEL_HOMESPACE,
        )
    except Exception as e:
        raise ApiError(400, 'SBOL Conversion Failed: ' + str(e)) from e

    if not req.sbh_token:
        print('Unable to login to SynBioHub')
        raise ApiError(400, 'Unable to login to SynBioHub')
    user = login(req.sbh_url, req.sbh_token)

    try:
        sub_collection_url = upload_to_sbh(
            sbol_doc, req.sbh_url, req.sbh_prefix, req.sbh_token, user.graph,
            req.collection_url, req.import_type, workspace.path('SBOL_final.xml'),
            req.overwrite_merge,
        )
    except Exception as e:
        print('Error uploading to SynBioHub')
        raise ApiError(400, f'Error uploading to SynBioHub: {e}') from e

    experiment_id = _experiment_id(sbol_doc)
    answer_url = _named_after(sub_collection_url, req.import_type, experiment_id)

    if attachments is not None:
        _attach(req, user, attachments, experiment_id, 'attachments')
    if plate_reader_attachments is not None:
        _attach(req, user, plate_reader_attachments, experiment_id, 'plate reader attachments')

    fj_url = req.fj_url
    if (req.fj_study_id is not None and req.fj_url is not None
            and req.fj_token is not None and plate_reader_attachments):
        fj_url = flapjack_push.push(req, metadata_path, plate_reader_attachments, workspace)

    print("XDC run complete")
    return {
        'sbh_url': req.sbh_url,
        'subCollectionUrl': answer_url,
        'fj_url': fj_url,
        'status': 'success',
    }


def _titled_files(files, field: str, params: dict, key: str) -> Optional[TitledFiles]:
    """The files in `field`, if Params also carries their title map under `key`."""
    if field in files and key in params:
        return TitledFiles(files=tuple(files.getlist(field)), titles=params[key])
    return None


def _by_title(titled: Optional[TitledFiles], kind: str) -> Optional[Dict[str, FileStorage]]:
    """{title: file} for upload_sbh_attachments; 400 for a file with no title."""
    if titled is None:
        return None
    for file in titled.files:
        if file.filename not in titled.titles:
            raise ApiError(
                400, f"{kind} metadata for file '{file.filename}' not found in request",
            )
    return {titled.titles[file.filename]: file for file in titled.files}


def _experiment_id(doc: sbol2.Document) -> Optional[str]:
    for top_level in doc:
        if isinstance(top_level, sbol2.Experiment):
            return top_level.displayId
    return None


def _named_after(sub_collection_url: str, import_type: str,
                 experiment_id: Optional[str]) -> str:
    """The URL to answer with: the experiment's, when the workbook held one."""
    if experiment_id is None:
        return sub_collection_url
    return sub_collection_url.replace('/' + import_type + '/', '/' + experiment_id + '/')


def _attach(req: XdcRequest, user: SbhUser, files_by_title: Dict[str, FileStorage],
            experiment_id: Optional[str], what: str) -> None:
    try:
        upload_sbh_attachments(
            req.sbh_url, req.sbh_prefix, req.sbh_token, user.name, user.graph,
            req.collection_url, files_by_title, experiment_id,
        )
    except Exception as e:
        print(f'Error uploading {what} to SynBioHub')
        raise ApiError(400, f'Error uploading {what} to SynBioHub: {e}') from e
