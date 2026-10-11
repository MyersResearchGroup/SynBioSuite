"""Experimental Data Converter (XDC): an Excel workbook to SBOL, uploaded to
SynBioHub with its attachments, and its plate reader output on to Flapjack.

Behind POST /api/uploadResource and POST /api/uploadExperiment.
"""
from __future__ import annotations

import os
import traceback
from dataclasses import dataclass
from typing import Dict, Optional, Tuple
from uuid import uuid4

import sbol2
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from ..errors import ApiError
from ..synbiohubUpload import upload_sbh_attachments, upload_to_sbh
from ..utils import convert_to_sbol
from .common import SbhUser, login, overwrite_merge, read_params, sbh_base_url

REQUIRED_PARAMS = (
    'sbh_url', 'sbh_prefix', 'sbh_token', 'fj_url', 'fj_token', 'collection_url',
    'fj_study_id', 'sbh_overwrite', 'fj_overwrite', 'importType',
)
WORKBOOK_EXTENSIONS = ('.xlsx', '.xlsm')

# Every workbook converts against this homespace, whatever its import type;
# api/registry.py's EXCEL_HOMESPACE mirrors it.
EXCEL_HOMESPACE = 'https://example.org/'

# A frontend on the developer's machine names Flapjack by its published port;
# from inside the backend's container it is the Compose service instead.
LOCAL_FLAPJACK_URL = 'http://localhost:8000'
DOCKER_FLAPJACK_URL = 'http://flapjack-api-1:8000'
DEFAULT_TEMPERATURE = 37


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
    upload_dir = os.path.join(os.getcwd(), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    safe_metadata_filename = secure_filename(req.metadata_file.filename)
    if safe_metadata_filename == '':
        raise ApiError(400, 'Invalid Metadata file name')
    metadata_path = os.path.join(upload_dir, f'{uuid4()}_{safe_metadata_filename}')
    req.metadata_file.save(metadata_path)

    # Checked only now, with the workbook already on disk.
    attachments = _by_title(req.attachments, 'Attachment')
    plate_reader_attachments = _by_title(req.plate_reader_outputs, 'Plate Reader Output')

    try:
        # A bare filename: it lands in the process CWD.
        file_path_out = f'{uuid4()}_converted_SBOL.xml'
        sbol_doc = convert_to_sbol(metadata_path, file_path_out, EXCEL_HOMESPACE)
    except Exception as e:
        raise ApiError(400, 'SBOL Conversion Failed: ' + str(e)) from e

    if not req.sbh_token:
        print('Unable to login to SynBioHub')
        raise ApiError(400, 'Unable to login to SynBioHub')
    user = login(req.sbh_url, req.sbh_token)

    try:
        # A bare filename here too.
        file_path_out_final = f'{uuid4()}_SBOL_final.xml'
        sub_collection_url = upload_to_sbh(
            sbol_doc, req.sbh_url, req.sbh_prefix, req.sbh_token, user.graph,
            req.collection_url, req.import_type, file_path_out_final, req.overwrite_merge,
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
        fj_url = _push_to_flapjack(req, metadata_path, plate_reader_attachments, upload_dir)

    print("XDC run complete")
    result = {
        'sbh_url': req.sbh_url,
        'subCollectionUrl': answer_url,
        'fj_url': fj_url,
        'status': 'success',
    }
    os.remove(metadata_path)
    return result


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


def _push_to_flapjack(req: XdcRequest, metadata_path: str,
                      plate_files_by_title: Dict[str, FileStorage], upload_dir: str) -> str:
    """Import each plate file into the Flapjack study; return the URL used.

    Any failure is a 400, although SynBioHub already holds the upload.
    """
    try:
        # Imported here: a Flapjack install that will not load fails this
        # request, not the server.
        from .. import uploadFlapjack as fj_import

        fj_url = DOCKER_FLAPJACK_URL if req.fj_url == LOCAL_FLAPJACK_URL else req.fj_url

        # SynBioHub client (token) + Flapjack client (access token only)
        shop = fj_import.get_sbh_client(
            token=req.sbh_token, url=req.sbh_url, prefix=req.sbh_prefix,
        )
        flapjack = fj_import.get_flapjack_client(
            access_token=req.fj_token, refresh_token=req.fj_refresh_token,
            url=fj_url.split('://')[-1],
        )

        plate_paths = [
            _save_plate(plate_file, upload_dir)
            for plate_file in plate_files_by_title.values()
        ]

        # one plate file per populated assay (in order), uploaded into the SBS
        # study; zip() drops whichever side has more
        for (assay_id, assay_name, temperature), plate in zip(
                fj_import.read_assays(metadata_path), plate_paths):
            template_out = os.path.join(upload_dir, f'{uuid4()}_flapjack_input.xlsx')
            fj_import.import_study(
                shop, flapjack, metadata_path, plate,
                int(req.fj_study_id), assay_name, template_out,
                assay_id=assay_id, temperature=temperature or DEFAULT_TEMPERATURE)
            os.remove(template_out)

        for plate in plate_paths:
            try:
                os.remove(plate)
            except OSError:
                # Don't fail the whole process if we can't delete a temporary file; just log it
                print(f"Warning: failed to remove temporary plate file {plate}")
        return fj_url
    except Exception as e:
        traceback.print_exc()
        print('Error uploading to Flapjack')
        raise ApiError(400, f'Error uploading to Flapjack: {e}') from e


def _save_plate(plate_file: FileStorage, upload_dir: str) -> str:
    # SynBioHub has just been sent this stream, so it is at its end.
    plate_file.stream.seek(0)
    path = os.path.join(upload_dir, f'{uuid4()}_{secure_filename(plate_file.filename)}')
    plate_file.save(path)
    return path
