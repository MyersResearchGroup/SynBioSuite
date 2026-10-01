"""Turning an uploaded file into an sbol2.Document.

Collections accept Excel, SBOL, or both (registry.CollectionSpec.accepts). Excel
is converted on the way in via utils.convert_to_sbol, which wraps excel2sbol --
the workbooks are self-describing (an `Init` sheet and a `column_definitions`
sheet drive the conversion), so one path serves every Excel-backed collection.
"""
import os
from uuid import uuid4

import pandas as pd
import sbol2
from werkzeug.utils import secure_filename

from ..utils import convert_to_sbol
from .errors import ApiError
from .registry import EXCEL, EXCEL_HOMESPACE, SBOL, CollectionSpec

EXCEL_EXTENSIONS = ('.xlsx', '.xlsm')
SBOL_EXTENSIONS = ('.xml', '.rdf', '.sbol')

# excel2sbol.initialise() requires both of these sheets.
REQUIRED_SHEETS = ('Init', 'column_definitions')

# convert_to_sbol reads the result with sbol2, so anything the workbook's
# Init sheet declares other than SBOL 2 produces a document we cannot consume.
SUPPORTED_SBOL_VERSION = 2

_KIND_LABEL = {EXCEL: 'an Excel workbook (.xlsx/.xlsm)', SBOL: 'SBOL XML (.xml)'}


def load_document(spec: CollectionSpec, file_storage, upload_dir: str) -> sbol2.Document:
    """Validate, convert if needed, and return the uploaded file as SBOL.

    Raises ApiError for anything the caller got wrong; leaves no temp files behind.
    """
    filename = (getattr(file_storage, 'filename', '') or '').strip()
    if not filename:
        raise ApiError(400, 'No file was uploaded')

    kind, extension = _classify(filename)
    _require_accepted(spec, kind, extension)

    safe_name = secure_filename(filename)
    if not safe_name:
        raise ApiError(400, f'Invalid file name: {filename}')

    source_path = os.path.join(upload_dir, f'{uuid4()}_{safe_name}')
    # convert_to_sbol writes its output to this path; xdc_run passes a bare
    # filename here, which lands in the process CWD and is never cleaned up.
    converted_path = os.path.join(upload_dir, f'{uuid4()}_converted_SBOL.xml')

    os.makedirs(upload_dir, exist_ok=True)
    file_storage.save(source_path)
    try:
        if kind == EXCEL:
            doc = _convert_workbook(source_path, converted_path)
        else:
            doc = _read_sbol(spec, source_path)
    finally:
        _cleanup(source_path, converted_path)

    if not len(doc):
        raise ApiError(
            400,
            f'{filename} produced no SBOL objects. For a workbook, check that its '
            f'sheets are marked Convert in the Init sheet.',
        )
    return doc


def _classify(filename: str):
    extension = os.path.splitext(filename)[1].lower()
    if extension in EXCEL_EXTENSIONS:
        return EXCEL, extension
    if extension in SBOL_EXTENSIONS:
        return SBOL, extension
    raise ApiError(
        400,
        f'Unsupported file type "{extension or filename}". Expected one of: '
        f'{", ".join(EXCEL_EXTENSIONS + SBOL_EXTENSIONS)}',
    )


def _require_accepted(spec: CollectionSpec, kind: str, extension: str):
    if kind not in spec.accepts:
        accepted = ' or '.join(_KIND_LABEL[k] for k in sorted(spec.accepts))
        raise ApiError(
            415,
            f'/{spec.path} does not accept {extension} files; it takes {accepted}',
        )


def _convert_workbook(source_path: str, converted_path: str):
    """Convert a workbook against EXCEL_HOMESPACE, whatever collection it is for.

    Not spec.homespace: route.py:xdc_run converts every workbook against
    https://example.org/ regardless of type, and both upload paths should put an
    object on the same URI before submission. SynBioHub re-homes on ingest, so
    this is not visible in the final URI -- it just keeps the two paths honest.
    """
    _validate_workbook(source_path)
    try:
        return convert_to_sbol(source_path, converted_path, EXCEL_HOMESPACE)
    except ApiError:
        raise
    except Exception as error:
        raise ApiError(400, f'Excel to SBOL conversion failed: {error}')


def _validate_workbook(path: str):
    """Fail with a 400 that names the problem, rather than a pandas traceback."""
    try:
        workbook = pd.ExcelFile(path, engine='openpyxl')
        sheet_names = set(workbook.sheet_names)
    except Exception as error:
        raise ApiError(400, f'Could not read the workbook: {error}')

    missing = [sheet for sheet in REQUIRED_SHEETS if sheet not in sheet_names]
    if missing:
        raise ApiError(
            400,
            f'Workbook is not an Excel-to-SBOL template: missing the '
            f'{", ".join(missing)} sheet(s)',
        )

    version = _declared_sbol_version(path)
    if version != SUPPORTED_SBOL_VERSION:
        # excel2sbol.converter takes this value over the one its caller passes,
        # so an SBOL3 workbook would convert cleanly and then read back empty.
        raise ApiError(
            400,
            f'Workbook declares SBOL Version {version} in its Init sheet; '
            f'only SBOL {SUPPORTED_SBOL_VERSION} is supported',
        )


def _declared_sbol_version(path: str):
    """Read Init!'SBOL Version' exactly the way excel2sbol.initialise() does."""
    try:
        header = pd.read_excel(
            path, sheet_name='Init', nrows=4, index_col=0, header=None,
            engine='openpyxl',
        )
        rows = header.applymap(
            lambda value: value.strip() if isinstance(value, str) else value
        ).to_dict('index')
        return rows['SBOL Version'][1]
    except KeyError:
        raise ApiError(400, "Workbook's Init sheet does not declare an SBOL Version")
    except Exception as error:
        raise ApiError(400, f"Could not read the workbook's Init sheet: {error}")


def _read_sbol(spec: CollectionSpec, path: str) -> sbol2.Document:
    # These are process-global in sbol2. Safe under the shipped uwsgi.ini
    # (processes = 4, no threads); not under a threaded dev server.
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
    sbol2.setHomespace(spec.homespace)

    doc = sbol2.Document()
    try:
        doc.read(path)
    except Exception as error:
        raise ApiError(400, f'Could not parse the SBOL file: {error}')
    return doc


def _cleanup(*paths):
    for path in paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError as error:
            print(f'Warning: failed to remove temporary file {path}: {error}')
