"""POST /api/uploadResource and /api/uploadExperiment, through the HTTP client.

Both routes run the same code. The tests patch only what the service reaches
its collaborators through (sbh_http, excel2sbol.converter, the functions on
the uploadFlapjack module), never the service itself, so they held unedited
while the code moved out of route.py. Behaviour that is odd but kept on
purpose is marked "Wart, pinned".
"""
import os
import sys

import excel2sbol
import pytest
import sbol2

import sbs_server.app as app_package
from sbs_server.app import uploadFlapjack

from conftest import STUDY_URI, TOKEN, FakeResponse, capture_submitted
from legacy_helpers import (
    ATTACH_URL,
    LOGIN_GRAPH,
    SBH_PREFIX,
    SBH_URL,
    SBH_USER,
    STUDY_ROOT,
    UUID_PREFIX_LENGTH,
    capture_attached,
    file_part,
    leftovers,
    params_part,
    post,
    raw_part,
    requested,
    sparql_queries,
    synbiohub_answers,
    without,
)
from test_ingest import SYNTHETIC_WORKBOOK

pytestmark = pytest.mark.usefixtures('workdir')

RESOURCE_URL = '/api/uploadResource'
EXPERIMENT_URL = '/api/uploadExperiment'
EXCEL_HOMESPACE = 'https://example.org/'
EXPERIMENT_ID = 'exp1'
EXPERIMENT_ATTACH_URL = f'{SBH_URL}/user/{SBH_USER}/Test/{EXPERIMENT_ID}/1/attach'
LOCAL_FLAPJACK_URL = 'http://localhost:8000'
# What the route swaps LOCAL_FLAPJACK_URL for: Flapjack's name on the Docker
# network the backend runs in.
DOCKER_FLAPJACK_URL = 'http://flapjack-api-1:8000'

PARAMS = {
    'sbh_url': SBH_URL,
    'sbh_prefix': SBH_PREFIX,
    'sbh_token': TOKEN,
    'collection_url': STUDY_URI,
    'sbh_overwrite': True,
    'fj_url': None,
    'fj_token': None,
    'fj_study_id': None,
    'fj_overwrite': 1,
    'importType': 'Resources',
}
REQUIRED = [
    'sbh_url', 'sbh_prefix', 'sbh_token', 'fj_url', 'fj_token', 'collection_url',
    'fj_study_id', 'sbh_overwrite', 'fj_overwrite', 'importType',
]
FLAPJACK = {
    'importType': 'Assays',
    'fj_url': LOCAL_FLAPJACK_URL,
    'fj_token': 'fj-access',
    'fj_refresh_token': 'fj-refresh',
    'fj_study_id': '7',
}


def workbook(filename='resources.xlsx'):
    """The committed synthetic Resources workbook: a real conversion."""
    return file_part(SYNTHETIC_WORKBOOK, filename)


def assay_workbook():
    """A stand-in that the fake converter and the fake Flapjack never open."""
    return raw_part(b'never read', 'assay.xlsx')


def plates(*names):
    return [raw_part(f'{name} readings'.encode(), name) for name in names]


def titled(*names):
    """The filename -> title map the frontend sends alongside extra files."""
    return {name: name for name in names}


def upload(client, url=RESOURCE_URL, *, metadata=None, attachment_files=(),
           plate_files=(), **overrides):
    parts = {
        'Metadata': metadata or workbook(),
        'Params': params_part({**PARAMS, **overrides}),
    }
    if attachment_files:
        parts['Attachments'] = list(attachment_files)
    if plate_files:
        parts['Plate_Reader_Output'] = list(plate_files)
    return post(client, url, **parts)


def read_back(body):
    doc = sbol2.Document()
    doc.readString(body)
    return doc


@pytest.fixture
def converts_to_an_experiment(monkeypatch):
    """Stand in for excel2sbol with a conversion that yields one Experiment.

    The synthetic workbook has none, and an Experiment's displayId is what the
    route puts in the returned URL and in the attach URL. Like the real
    converter, this sets the homespace and writes file_path_out.
    """
    def converter(file_path_in, file_path_out, homespace, sbol_version):
        sbol2.setHomespace(homespace)
        doc = sbol2.Document()
        doc.add(sbol2.Experiment(EXPERIMENT_ID))
        doc.write(file_path_out)

    monkeypatch.setattr(excel2sbol, 'converter', converter)


class FakeFlapjack:
    """Stands in for the four uploadFlapjack functions the route calls."""

    def __init__(self, assays, failure=None):
        self.assays = assays
        self.failure = failure
        self.sbh_clients = []
        self.flapjack_clients = []
        self.imports = []

    def get_sbh_client(self, **kwargs):
        self.sbh_clients.append(kwargs)
        return 'shop'

    def get_flapjack_client(self, **kwargs):
        self.flapjack_clients.append(kwargs)
        return 'flapjack'

    def read_assays(self, workbook_path):
        return list(self.assays)

    def import_study(self, shop, flapjack, workbook_path, plate_file, study_id,
                     assay_name, output, **kwargs):
        if self.failure is not None:
            raise self.failure
        with open(plate_file, 'rb') as handle:
            plate = handle.read()
        # The route deletes the template afterwards and fails if it is missing.
        with open(output, 'w') as handle:
            handle.write('template')
        self.imports.append({
            'clients': (shop, flapjack),
            'workbook': os.path.basename(workbook_path)[UUID_PREFIX_LENGTH:],
            'plate': plate,
            'study_id': study_id,
            'assay_name': assay_name,
            **kwargs,
        })


@pytest.fixture
def flapjack(monkeypatch):
    def install(assays, failure=None):
        fake = FakeFlapjack(assays, failure)
        for name in ('get_sbh_client', 'get_flapjack_client', 'read_assays', 'import_study'):
            monkeypatch.setattr(uploadFlapjack, name, getattr(fake, name))
        return fake
    return install


# ------------------------------------------------------- a workbook on its own

@pytest.mark.parametrize('url', [RESOURCE_URL, EXPERIMENT_URL])
def test_a_workbook_upload_answers_with_the_sub_collection(client, legacy_sbh, url):
    synbiohub_answers(legacy_sbh)

    response = upload(client, url)

    assert response.status_code == 200
    assert response.get_json() == {
        'sbh_url': SBH_URL,
        'subCollectionUrl': f'{STUDY_ROOT}/Resources/1',
        'fj_url': None,
        'status': 'success',
    }


def test_a_workbook_is_converted_then_submitted(client, legacy_sbh, monkeypatch):
    synbiohub_answers(legacy_sbh)
    submitted = capture_submitted(legacy_sbh, monkeypatch)

    upload(client)

    assert requested(legacy_sbh) == [
        f'GET {SBH_URL}/profile',
        f'GET {SBH_URL}/sparql',
        f'POST {SBH_URL}/submit',
    ]
    [members] = sparql_queries(legacy_sbh)
    assert f'<{STUDY_ROOT}/Resources/1> sbol:member' in members
    assert f'FROM <{LOGIN_GRAPH}>' in members

    # Converted against https://example.org/, whatever the import type.
    collection = read_back(submitted[0]).getCollection(f'{EXCEL_HOMESPACE}Resources/1')
    assert sorted(collection.members) == [
        f'{EXCEL_HOMESPACE}fixture_chemical_1/1',
        f'{EXCEL_HOMESPACE}fixture_promoter_1/1',
        f'{EXCEL_HOMESPACE}fixture_promoter_1_sequence/1',
    ]


@pytest.mark.parametrize('sbh_overwrite, overwrite_merge', [(True, 3), (False, 2)])
def test_the_submit_merges_into_the_study(
    client, legacy_sbh, sbh_overwrite, overwrite_merge,
):
    synbiohub_answers(legacy_sbh)

    upload(client, sbh_overwrite=sbh_overwrite)

    [submit] = legacy_sbh.calls_matching('/submit')
    assert submit.headers['X-authorization'] == TOKEN
    assert submit.kwargs['data'] == {
        'rootCollections': STUDY_URI,
        'overwrite_merge': overwrite_merge,
    }


def test_the_workbook_extension_is_not_case_sensitive(client, legacy_sbh):
    synbiohub_answers(legacy_sbh)

    response = upload(client, metadata=workbook('RESOURCES.XLSX'))

    assert response.status_code == 200


def assert_nothing_left(workdir):
    assert leftovers(workdir) == []
    assert leftovers(workdir / 'uploads') == []


def test_a_successful_upload_leaves_no_temp_files(client, legacy_sbh, workdir):
    synbiohub_answers(legacy_sbh)

    upload(client)

    assert_nothing_left(workdir)


def test_the_submitted_document_is_written_under_uploads(client, legacy_sbh, workdir):
    """Not to the process CWD under a bare filename, as it used to be."""
    synbiohub_answers(legacy_sbh)

    upload(client)

    [submit] = legacy_sbh.calls_matching('/submit')
    written = submit.kwargs['files']['files'].name
    assert os.path.dirname(written) == str(workdir / 'uploads')


# ----------------------------------------------------------- with attachments

def test_an_attachment_is_uploaded_under_its_title(client, legacy_sbh, monkeypatch):
    synbiohub_answers(legacy_sbh)
    attached = capture_attached(monkeypatch)

    response = upload(
        client, EXPERIMENT_URL,
        attachment_files=[raw_part(b'lab notes', 'notes.txt')],
        attachments={'notes.txt': 'Lab notes'},
    )

    assert response.status_code == 200
    assert requested(legacy_sbh) == [
        f'GET {SBH_URL}/profile',
        f'GET {SBH_URL}/sparql',   # the sub-collection's members
        f'POST {SBH_URL}/submit',
        f'GET {SBH_URL}/sparql',   # is there an attachment to replace?
        f'POST {ATTACH_URL}',
    ]
    assert attached == [('notes.txt', b'lab notes')]
    lookup = sparql_queries(legacy_sbh)[1]
    assert 'dcterms:title "Lab notes"' in lookup
    assert f'FROM <{LOGIN_GRAPH}>' in lookup


def test_every_attachment_is_uploaded(client, legacy_sbh, monkeypatch):
    synbiohub_answers(legacy_sbh)
    attached = capture_attached(monkeypatch)

    upload(
        client, EXPERIMENT_URL,
        attachment_files=[raw_part(b'one', 'a.txt'), raw_part(b'two', 'b.txt')],
        attachments=titled('a.txt', 'b.txt'),
    )

    assert attached == [('a.txt', b'one'), ('b.txt', b'two')]


def test_attachment_files_without_the_param_are_dropped(client, legacy_sbh):
    """Wart, pinned: with no `attachments` map in Params the files are ignored
    rather than rejected."""
    synbiohub_answers(legacy_sbh)

    response = upload(
        client, EXPERIMENT_URL, attachment_files=[raw_part(b'lab notes', 'notes.txt')],
    )

    assert response.status_code == 200
    assert legacy_sbh.calls_matching('/attach') == []


def test_an_experiment_names_the_answer_and_takes_the_attachments(
    client, legacy_sbh, monkeypatch, converts_to_an_experiment,
):
    synbiohub_answers(legacy_sbh)
    submitted = capture_submitted(legacy_sbh, monkeypatch)

    response = upload(
        client, EXPERIMENT_URL,
        metadata=assay_workbook(),
        attachment_files=[raw_part(b'lab notes', 'notes.txt')],
        attachments=titled('notes.txt'),
        importType='Assays',
    )

    assert response.status_code == 200
    assert response.get_json()['subCollectionUrl'] == f'{STUDY_ROOT}/{EXPERIMENT_ID}/1'
    [attach] = legacy_sbh.calls_matching('/attach')
    assert attach.url == EXPERIMENT_ATTACH_URL
    # The sub-collection submitted is still the import type's.
    collection = read_back(submitted[0]).getCollection(f'{EXCEL_HOMESPACE}Assays/1')
    assert list(collection.members) == [f'{EXCEL_HOMESPACE}{EXPERIMENT_ID}/1']


# ------------------------------------------------------------------- Flapjack

def test_plate_files_go_to_synbiohub_and_then_to_flapjack(
    client, legacy_sbh, monkeypatch, flapjack, converts_to_an_experiment,
):
    synbiohub_answers(legacy_sbh)
    attached = capture_attached(monkeypatch)
    fake = flapjack([('a1', 'Assay 1', None), ('a2', 'Assay 2', 30.0)])

    response = upload(
        client, EXPERIMENT_URL,
        metadata=assay_workbook(),
        plate_files=plates('plate1.txt', 'plate2.txt'),
        plateReaderOutputs=titled('plate1.txt', 'plate2.txt'),
        **FLAPJACK,
    )

    assert response.status_code == 200
    assert response.get_json() == {
        'sbh_url': SBH_URL,
        'subCollectionUrl': f'{STUDY_ROOT}/{EXPERIMENT_ID}/1',
        # Wart, pinned: the Docker-internal name, not the URL the caller sent.
        'fj_url': DOCKER_FLAPJACK_URL,
        'status': 'success',
    }
    assert attached == [
        ('plate1.txt', b'plate1.txt readings'),
        ('plate2.txt', b'plate2.txt readings'),
    ]
    assert fake.sbh_clients == [{'token': TOKEN, 'url': SBH_URL, 'prefix': SBH_PREFIX}]
    assert fake.flapjack_clients == [{
        'access_token': 'fj-access',
        'refresh_token': 'fj-refresh',
        'url': 'flapjack-api-1:8000',
    }]
    # Each plate is read again from its start, though SynBioHub has just been
    # sent it; the study id arrives as an int; no temperature means 37.
    assert fake.imports == [
        {
            'clients': ('shop', 'flapjack'), 'workbook': 'assay.xlsx',
            'plate': b'plate1.txt readings', 'study_id': 7,
            'assay_name': 'Assay 1', 'assay_id': 'a1', 'temperature': 37,
        },
        {
            'clients': ('shop', 'flapjack'), 'workbook': 'assay.xlsx',
            'plate': b'plate2.txt readings', 'study_id': 7,
            'assay_name': 'Assay 2', 'assay_id': 'a2', 'temperature': 30.0,
        },
    ]


def test_a_flapjack_push_cleans_up_after_itself(
    client, legacy_sbh, flapjack, converts_to_an_experiment, workdir,
):
    synbiohub_answers(legacy_sbh)
    flapjack([('a1', 'Assay 1', None)])

    upload(
        client, EXPERIMENT_URL,
        metadata=assay_workbook(),
        plate_files=plates('plate1.txt'),
        plateReaderOutputs=titled('plate1.txt'),
        **FLAPJACK,
    )

    assert_nothing_left(workdir)


@pytest.mark.parametrize('assay_count, plate_names, imported', [
    (2, ['plate1.txt'], ['Assay 1']),
    (1, ['plate1.txt', 'plate2.txt'], ['Assay 1']),
])
def test_assays_and_plates_are_paired_up_to_the_shorter_list(
    client, legacy_sbh, flapjack, converts_to_an_experiment,
    assay_count, plate_names, imported,
):
    """Pinned: the surplus on either side is dropped without a word."""
    synbiohub_answers(legacy_sbh)
    assays = [('a1', 'Assay 1', None), ('a2', 'Assay 2', None)][:assay_count]
    fake = flapjack(assays)

    response = upload(
        client, EXPERIMENT_URL,
        metadata=assay_workbook(),
        plate_files=plates(*plate_names),
        plateReaderOutputs=titled(*plate_names),
        **FLAPJACK,
    )

    assert response.status_code == 200
    assert [call['assay_name'] for call in fake.imports] == imported
    assert [call['plate'] for call in fake.imports] == [b'plate1.txt readings']


def test_another_flapjack_url_is_used_as_given(
    client, legacy_sbh, flapjack, converts_to_an_experiment,
):
    synbiohub_answers(legacy_sbh)
    fake = flapjack([('a1', 'Assay 1', None)])

    response = upload(
        client, EXPERIMENT_URL,
        metadata=assay_workbook(),
        plate_files=plates('plate1.txt'),
        plateReaderOutputs=titled('plate1.txt'),
        **{**FLAPJACK, 'fj_url': 'https://flapjack.example.org'},
    )

    assert response.get_json()['fj_url'] == 'https://flapjack.example.org'
    assert fake.flapjack_clients[0]['url'] == 'flapjack.example.org'


def test_without_plate_files_flapjack_is_not_contacted(
    client, legacy_sbh, flapjack, converts_to_an_experiment,
):
    synbiohub_answers(legacy_sbh)
    fake = flapjack([('a1', 'Assay 1', None)])

    response = upload(client, EXPERIMENT_URL, metadata=assay_workbook(), **FLAPJACK)

    assert response.status_code == 200
    # Not rewritten either: that only happens on the way into Flapjack.
    assert response.get_json()['fj_url'] == LOCAL_FLAPJACK_URL
    assert fake.flapjack_clients == []
    assert fake.imports == []


def test_a_flapjack_failure_is_a_400_after_synbiohub_has_the_upload(
    client, legacy_sbh, flapjack, converts_to_an_experiment, workdir,
):
    """Pinned: the SynBioHub half has already happened and is not undone."""
    synbiohub_answers(legacy_sbh)
    flapjack([('a1', 'Assay 1', None)], failure=RuntimeError('flapjack is down'))

    response = upload(
        client, EXPERIMENT_URL,
        metadata=assay_workbook(),
        plate_files=plates('plate1.txt'),
        plateReaderOutputs=titled('plate1.txt'),
        **FLAPJACK,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        'error': 'Error uploading to Flapjack: flapjack is down',
    }
    assert len(legacy_sbh.calls_matching('/submit')) == 1
    assert len(legacy_sbh.calls_matching('/attach')) == 1
    assert_nothing_left(workdir)


def test_a_flapjack_module_that_will_not_import_is_a_400_too(
    client, legacy_sbh, monkeypatch, converts_to_an_experiment,
):
    """Pinned: the import happens inside the request, so a broken Flapjack
    install fails this upload rather than the whole server."""
    synbiohub_answers(legacy_sbh)
    monkeypatch.delattr(app_package, 'uploadFlapjack')
    monkeypatch.setitem(sys.modules, uploadFlapjack.__name__, None)

    response = upload(
        client, EXPERIMENT_URL,
        metadata=assay_workbook(),
        plate_files=plates('plate1.txt'),
        plateReaderOutputs=titled('plate1.txt'),
        **FLAPJACK,
    )

    assert response.status_code == 400
    assert response.get_json()['error'].startswith('Error uploading to Flapjack: ')
    assert len(legacy_sbh.calls_matching('/submit')) == 1


# ------------------------------------------------- rejected before any request

def assert_rejected(response, sbh, error):
    assert response.status_code == 400
    assert response.get_json() == {'error': error}
    assert sbh.calls == []


def test_no_metadata_part_is_400(client, legacy_sbh):
    response = post(client, RESOURCE_URL, Params=params_part(PARAMS))

    assert_rejected(response, legacy_sbh, 'No file part')


@pytest.mark.parametrize('filename, error', [
    ('', 'No Metadata file'),
    ('data.csv', 'Invalid Metadata file format'),
    ('data', 'Invalid Metadata file format'),
])
def test_the_metadata_file_must_be_a_named_workbook(client, legacy_sbh, filename, error):
    response = upload(client, metadata=workbook(filename))

    assert_rejected(response, legacy_sbh, error)


def test_no_params_part_is_400(client, legacy_sbh):
    response = post(client, RESOURCE_URL, Metadata=workbook())

    assert_rejected(response, legacy_sbh, 'No Params file part')


def test_a_params_part_without_a_filename_is_400(client, legacy_sbh):
    response = post(
        client, RESOURCE_URL,
        Metadata=workbook(), Params=params_part(PARAMS, filename=''),
    )

    assert_rejected(response, legacy_sbh, 'No selected Params file')


@pytest.mark.parametrize('missing', REQUIRED)
def test_each_required_param_is_checked(client, legacy_sbh, missing):
    response = post(
        client, RESOURCE_URL,
        Metadata=workbook(), Params=params_part(without(PARAMS, missing)),
    )

    assert_rejected(response, legacy_sbh, f'Parameter {missing} not found in request')


def test_an_unusable_sbh_url_is_400(client, legacy_sbh):
    response = upload(client, sbh_url='ftp://synbiohub.org')

    assert_rejected(response, legacy_sbh, 'Invalid sbh_url: it must be an http(s) URL')


def test_the_url_is_checked_before_the_token(client, legacy_sbh):
    """The other way round from /api/uploadSBOL."""
    response = upload(client, sbh_url='ftp://synbiohub.org', sbh_token=None)

    assert_rejected(response, legacy_sbh, 'Invalid sbh_url: it must be an http(s) URL')


def test_a_null_token_is_400(client, legacy_sbh):
    response = upload(client, sbh_token=None)

    assert_rejected(response, legacy_sbh, 'No SynBioHub credentials provided')


def test_a_flapjack_url_needs_a_flapjack_token(client, legacy_sbh):
    response = upload(client, fj_url=LOCAL_FLAPJACK_URL)

    assert_rejected(
        response, legacy_sbh,
        'Flapjack URL was provided, but no Flapjack credentials were provided',
    )


def test_none_of_those_saves_the_workbook(client, legacy_sbh, workdir):
    upload(client, sbh_token=None)

    assert leftovers(workdir / 'uploads') == []


# --------------------------------------- rejected once the workbook is on disk

def test_an_attachment_the_params_do_not_name_is_400(client, legacy_sbh, workdir):
    response = upload(
        client, attachment_files=[raw_part(b'lab notes', 'notes.txt')], attachments={},
    )

    assert_rejected(
        response, legacy_sbh,
        "Attachment metadata for file 'notes.txt' not found in request",
    )
    assert_nothing_left(workdir)


def test_a_plate_file_the_params_do_not_name_is_400(client, legacy_sbh, workdir):
    response = upload(client, plate_files=plates('plate1.txt'), plateReaderOutputs={})

    assert_rejected(
        response, legacy_sbh,
        "Plate Reader Output metadata for file 'plate1.txt' not found in request",
    )
    assert_nothing_left(workdir)


def test_a_workbook_that_will_not_convert_is_400(client, legacy_sbh, workdir):
    response = upload(client, metadata=raw_part(b'not a workbook', 'bad.xlsx'))

    assert response.status_code == 400
    assert response.get_json()['error'].startswith('SBOL Conversion Failed: ')
    assert legacy_sbh.calls == []
    assert_nothing_left(workdir)


def test_an_empty_token_is_only_noticed_after_the_conversion(client, legacy_sbh):
    response = upload(client, sbh_token='')

    assert_rejected(response, legacy_sbh, 'Unable to login to SynBioHub')


def test_a_bad_workbook_is_reported_ahead_of_an_empty_token(client, legacy_sbh):
    response = upload(
        client, metadata=raw_part(b'not a workbook', 'bad.xlsx'), sbh_token='',
    )

    assert response.status_code == 400
    assert response.get_json()['error'].startswith('SBOL Conversion Failed: ')


# -------------------------------------------------------- SynBioHub says no

def test_a_failed_login_is_400(client, legacy_sbh, workdir):
    synbiohub_answers(legacy_sbh, profile=FakeResponse(401, text='bad token'))

    response = upload(client)

    assert response.status_code == 400
    assert response.get_json() == {
        'error': 'Error logging into SynBioHub: '
                 'Error accessing SynBioHub profile (401): bad token',
    }
    assert requested(legacy_sbh) == [f'GET {SBH_URL}/profile']
    assert_nothing_left(workdir)


def test_a_rejected_submit_is_400(client, legacy_sbh, workdir):
    synbiohub_answers(legacy_sbh, submit=FakeResponse(500, text='boom'))

    response = upload(client)

    assert response.status_code == 400
    assert response.get_json() == {
        'error': 'Error uploading to SynBioHub: SynBioHub submit failed (500): boom',
    }
    assert_nothing_left(workdir)


def test_a_rejected_attachment_is_400(client, legacy_sbh, workdir):
    synbiohub_answers(legacy_sbh, attach=FakeResponse(500, text='no room'))

    response = upload(
        client,
        attachment_files=[raw_part(b'lab notes', 'notes.txt')],
        attachments=titled('notes.txt'),
    )

    assert response.status_code == 400
    assert response.get_json() == {
        'error': 'Error uploading attachments to SynBioHub: '
                 'Uploading attachments to SynBioHub failed (500): no room',
    }
    assert len(legacy_sbh.calls_matching('/submit')) == 1
    assert_nothing_left(workdir)


def test_a_rejected_plate_file_is_400(client, legacy_sbh, workdir):
    synbiohub_answers(legacy_sbh, attach=FakeResponse(500, text='no room'))

    response = upload(
        client, plate_files=plates('plate1.txt'), plateReaderOutputs=titled('plate1.txt'),
    )

    assert response.status_code == 400
    assert response.get_json() == {
        'error': 'Error uploading plate reader attachments to SynBioHub: '
                 'Uploading attachments to SynBioHub failed (500): no room',
    }
    assert_nothing_left(workdir)


# ------------------------------------------------------- unhandled, so a 500

def test_params_that_are_not_json_are_unhandled(unhandled_client, legacy_sbh):
    """Wart, pinned: Flask's own error page, because nothing catches it."""
    response = post(
        unhandled_client, RESOURCE_URL,
        Metadata=workbook(), Params=raw_part(b'{not json', 'parameters.json'),
    )

    assert response.status_code == 500
    assert response.mimetype == 'text/html'
    assert legacy_sbh.calls == []
