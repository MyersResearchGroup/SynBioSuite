"""ingest.load_document: format detection, accepts enforcement, workbook guards."""
import os

import pytest
from openpyxl import Workbook
from werkzeug.datastructures import FileStorage

from sbs_server.app.api import ingest
from sbs_server.app.api.errors import ApiError
from sbs_server.app.api import registry
from sbs_server.app.api.registry import COLLECTIONS

TEMPLATE_DIR = os.path.expanduser('~/SPUR/Excel-to-SBOL/resources/templates')


def make_workbook(path, sbol_version=2, sheets=('Init', 'column_definitions')):
    """A workbook shaped the way excel2sbol.initialise() reads one."""
    wb = Workbook()
    wb.remove(wb.active)
    for name in sheets:
        ws = wb.create_sheet(name)
        if name == 'Init':
            ws['A1'], ws['B1'] = 'SBOL Version', sbol_version
            ws['A2'], ws['B2'] = 'Library Name', 'a'
    wb.save(path)
    return path


def upload(path, filename=None):
    return FileStorage(
        stream=open(path, 'rb'),
        filename=filename or os.path.basename(path),
    )


@pytest.fixture
def uploads(tmp_path):
    d = tmp_path / 'uploads'
    d.mkdir()
    return str(d)


def load(spec_path, file_storage, uploads):
    return ingest.load_document(COLLECTIONS[spec_path], file_storage, uploads)


# ------------------------------------------------------- format classification

@pytest.mark.parametrize('filename', ['a.xlsx', 'a.xlsm', 'A.XLSM'])
def test_excel_extensions_classify_as_excel(filename):
    kind, _ = ingest._classify(filename)
    assert kind == 'excel'


@pytest.mark.parametrize('filename', ['a.xml', 'a.rdf', 'a.sbol', 'A.XML'])
def test_sbol_extensions_classify_as_sbol(filename):
    kind, _ = ingest._classify(filename)
    assert kind == 'sbol'


@pytest.mark.parametrize('filename', ['a.csv', 'a.txt', 'a.json', 'noextension'])
def test_unknown_extension_is_400(filename):
    with pytest.raises(ApiError) as excinfo:
        ingest._classify(filename)
    assert excinfo.value.status == 400


def test_missing_file_is_400(uploads):
    with pytest.raises(ApiError) as excinfo:
        load('resources', FileStorage(filename=''), uploads)
    assert excinfo.value.status == 400


# ---------------------------------------------------------- accepts enforcement

def test_excel_into_an_sbol_only_collection_is_415(tmp_path, uploads):
    """This is the registry's `accepts` field doing its job."""
    path = make_workbook(tmp_path / 'r.xlsx')

    with pytest.raises(ApiError) as excinfo:
        load('devices', upload(path), uploads)

    assert excinfo.value.status == 415
    assert 'devices' in excinfo.value.message


@pytest.mark.parametrize(
    'path', [p for p, s in COLLECTIONS.items() if s.implemented and not s.excel_backed]
)
def test_every_sbol_only_collection_rejects_excel(tmp_path, uploads, path):
    workbook = make_workbook(tmp_path / f'{path}.xlsx')

    with pytest.raises(ApiError) as excinfo:
        load(path, upload(workbook), uploads)

    assert excinfo.value.status == 415


# ------------------------------------------------------------- workbook guards

def test_workbook_missing_required_sheets_is_400(tmp_path, uploads):
    path = make_workbook(tmp_path / 'bad.xlsx', sheets=('Sheet1',))

    with pytest.raises(ApiError) as excinfo:
        load('resources', upload(path), uploads)

    assert excinfo.value.status == 400
    assert 'Init' in excinfo.value.message


def test_workbook_declaring_sbol3_is_400_not_an_empty_upload(tmp_path, uploads):
    """excel2sbol takes the workbook's version over its caller's.

    An SBOL3 workbook converts happily and then reads back empty through sbol2,
    so without this guard the request would 'succeed' having uploaded nothing.
    """
    path = make_workbook(tmp_path / 'v3.xlsx', sbol_version=3)

    with pytest.raises(ApiError) as excinfo:
        load('resources', upload(path), uploads)

    assert excinfo.value.status == 400
    assert 'SBOL Version 3' in excinfo.value.message


def test_workbook_without_a_declared_version_is_400(tmp_path, uploads):
    wb = Workbook()
    wb.remove(wb.active)
    for name in ('Init', 'column_definitions'):
        wb.create_sheet(name)
    path = tmp_path / 'noversion.xlsx'
    wb.save(path)

    with pytest.raises(ApiError) as excinfo:
        load('resources', upload(path), uploads)

    assert excinfo.value.status == 400


def test_unreadable_sbol_is_400(tmp_path, uploads):
    path = tmp_path / 'junk.xml'
    path.write_text('this is not SBOL')

    with pytest.raises(ApiError) as excinfo:
        load('devices', upload(path), uploads)

    assert excinfo.value.status == 400


def test_empty_sbol_document_is_400(tmp_path, uploads, sbol_file):
    """A document with no top-levels must not submit silently."""
    empty = tmp_path / 'empty.xml'
    empty.write_text(
        '<?xml version="1.0" ?><rdf:RDF '
        'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>'
    )

    with pytest.raises(ApiError) as excinfo:
        load('devices', upload(str(empty)), uploads)

    assert excinfo.value.status == 400


# ------------------------------------------------------------------- happy path

def test_valid_sbol_loads(uploads, sbol_file):
    doc = load('devices', upload(sbol_file), uploads)

    assert len(doc) >= 1


def test_temp_files_are_cleaned_up(uploads, sbol_file):
    load('devices', upload(sbol_file), uploads)

    assert os.listdir(uploads) == []


def test_temp_files_are_cleaned_up_on_failure(tmp_path, uploads):
    path = make_workbook(tmp_path / 'bad.xlsx', sheets=('Sheet1',))

    with pytest.raises(ApiError):
        load('resources', upload(path), uploads)

    assert os.listdir(uploads) == []


@pytest.mark.skipif(
    not os.path.isdir(TEMPLATE_DIR),
    reason=f'Excel-to-SBOL templates not present at {TEMPLATE_DIR}',
)
@pytest.mark.parametrize(
    'template, collection',
    [('Resources.xlsm', 'resources'),
     ('Strains.xlsm', 'strains'),
     ('SampleDesign.xlsm', 'sample-designs')],
)
def test_real_blank_templates_pass_validation(tmp_path, template, collection):
    """The real templates must clear the guards, whatever they convert to."""
    path = os.path.join(TEMPLATE_DIR, template)
    if not os.path.exists(path):
        pytest.skip(f'{template} not in {TEMPLATE_DIR}')

    ingest._validate_workbook(path)


# --------------------------------------------------------- real conversion
# Everything above this line either rejects a workbook or stops at validation.
# These actually run excel2sbol, which nothing else in the suite does.

FILLED_WORKBOOK = os.path.expanduser(
    '~/SPUR/Align-TF-Cytom-12-plasmids_Resources.xlsm'
)


def test_conversion_uses_the_excel_homespace_not_the_collections(tmp_path, monkeypatch):
    """Workbooks convert against EXCEL_HOMESPACE whatever collection they are for.

    route.py:xdc_run hardcodes https://example.org/ for every workbook, so the
    two upload paths have to agree. resources' own spec.homespace is different,
    which is exactly the confusion this pins down.
    """
    seen = {}

    def fake_convert(source, out, homespace):
        seen['homespace'] = homespace
        return []

    monkeypatch.setattr(ingest, 'convert_to_sbol', fake_convert)
    path = make_workbook(tmp_path / 'ok.xlsx')

    ingest._convert_workbook(str(path), str(tmp_path / 'out.xml'))

    assert seen['homespace'] == registry.EXCEL_HOMESPACE
    assert seen['homespace'] != COLLECTIONS['resources'].homespace


@pytest.mark.skipif(
    not os.path.isdir(TEMPLATE_DIR),
    reason=f'Excel-to-SBOL templates not present at {TEMPLATE_DIR}',
)
def test_a_real_template_survives_conversion(tmp_path):
    """excel2sbol actually runs -- not mocked, not stopped at validation.

    A blank template legitimately yields no objects; what matters is that the
    conversion completes instead of raising.
    """
    path = os.path.join(TEMPLATE_DIR, 'Strains.xlsm')
    if not os.path.exists(path):
        pytest.skip(f'Strains.xlsm not in {TEMPLATE_DIR}')

    doc = ingest._convert_workbook(path, str(tmp_path / 'out.xml'))

    assert doc is not None
    assert len(doc) == 0, 'a blank template should convert to nothing'


@pytest.mark.skipif(
    not os.path.exists(FILLED_WORKBOOK),
    reason=f'filled workbook not present at {FILLED_WORKBOOK}',
)
def test_a_filled_workbook_converts_to_real_objects(uploads):
    """The flagship path end to end: .xlsm in, populated SBOL document out."""
    doc = load('resources', upload(FILLED_WORKBOOK), uploads)

    assert len(doc) > 1, 'a filled Resources workbook should yield many objects'
    identities = [tl.identity for tl in doc]
    assert all(i.startswith(registry.EXCEL_HOMESPACE) for i in identities), \
        f'unexpected homespace: {identities[:3]}'
    assert os.listdir(uploads) == [], 'conversion left temp files behind'
