"""POST /api/uploadSBOL, through the HTTP client.

The tests patch only what the service reaches SynBioHub and sbol2 through
(sbh_http, sbol2), never the service itself, so they held unedited while the
code moved out of route.py. Behaviour that is odd but kept on purpose is
marked "Wart, pinned".
"""
import pytest
import requests
import sbol2

from sbs_server.app.sbh_http import BlockedDestinationError
from sbs_server.app.utils import sbol_validation_disabled

from conftest import STUDY_URI, TOKEN, FakeResponse, capture_submitted
from legacy_helpers import (
    ATTACH_URL,
    COLLECTION_GRAPH,
    LOGIN_GRAPH,
    SBH_PREFIX,
    SBH_URL,
    STUDY_ROOT,
    bindings,
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

pytestmark = pytest.mark.usefixtures('workdir')

URL = '/api/uploadSBOL'
CANVAS_HOMESPACE = 'https://sbolcanvas.org/'
# What SPARQL answers for the SBML file once SynBioHub has stored it.
ATTACHMENT_URI = f'{STUDY_ROOT}/attachment_1/1'
SBML = b'<sbml/>'
UNEXPECTED_FAILURE = (
    'The SBOL upload failed unexpectedly. The details are in the server log.'
)

PARAMS = {
    'sbh_url': SBH_URL,
    'sbh_prefix': SBH_PREFIX,
    'sbh_token': TOKEN,
    'collection_url': STUDY_URI,
    'sbh_overwrite': True,
    'importType': 'Devices',
}
REQUIRED = ['sbh_url', 'sbh_prefix', 'sbh_token', 'collection_url', 'sbh_overwrite']


@pytest.fixture
def design_file(tmp_path):
    """An SBOL2 document whose one root is a ModuleDefinition, as SBOLCanvas saves."""
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
    sbol2.setHomespace(CANVAS_HOMESPACE)

    doc = sbol2.Document()
    doc.addModuleDefinition(sbol2.ModuleDefinition('circuit'))

    path = tmp_path / 'design.xml'
    with sbol_validation_disabled():
        doc.write(str(path))
    return str(path)


def upload(client, sbol_path, *, sbol_name='part.xml', sbml=None, **overrides):
    parts = {
        'SBOL': file_part(sbol_path, sbol_name),
        'Params': params_part({**PARAMS, **overrides}),
    }
    if sbml is not None:
        parts['SBML'] = sbml
    return post(client, URL, **parts)


def read_back(body):
    doc = sbol2.Document()
    doc.readString(body)
    return doc


# ------------------------------------------------------------- the response

@pytest.mark.parametrize('import_type', ['Devices', 'Plasmids'])
def test_a_part_upload_answers_with_the_root_components_uri(
    client, legacy_sbh, sbol_file, import_type,
):
    synbiohub_answers(legacy_sbh)

    response = upload(client, sbol_file, importType=import_type)

    assert response.status_code == 200
    assert response.get_json() == {
        'sbh_url': SBH_URL,
        'subCollectionUrl': f'{STUDY_ROOT}/test_part/1',
        'status': 'success',
    }


def test_a_design_upload_answers_with_the_root_modules_uri(
    client, legacy_sbh, design_file,
):
    synbiohub_answers(legacy_sbh)

    response = upload(client, design_file, importType='Designs')

    assert response.status_code == 200
    assert response.get_json() == {
        'sbh_url': SBH_URL,
        'subCollectionUrl': f'{STUDY_ROOT}/circuit/1',
        'status': 'success',
    }


@pytest.mark.parametrize('import_type', ['Models', 'Strains', 'Designs'])
def test_without_a_root_to_name_the_answer_is_the_sub_collection(
    client, legacy_sbh, sbol_file, import_type,
):
    """Only Devices, Plasmids and Designs look for a root, and this file has
    no ModuleDefinition for Designs to find."""
    synbiohub_answers(legacy_sbh)

    response = upload(client, sbol_file, importType=import_type)

    assert response.status_code == 200
    assert response.get_json()['subCollectionUrl'] == f'{STUDY_ROOT}/{import_type}/1'


# ---------------------------------------------------- what SynBioHub is sent

def test_an_upload_logs_in_lists_the_members_and_submits(client, legacy_sbh, sbol_file):
    synbiohub_answers(legacy_sbh)

    upload(client, sbol_file)

    assert requested(legacy_sbh) == [
        f'GET {SBH_URL}/profile',
        f'GET {SBH_URL}/sparql',
        f'POST {SBH_URL}/submit',
    ]
    [members] = sparql_queries(legacy_sbh)
    assert f'<{STUDY_ROOT}/Devices/1> sbol:member' in members
    # The graph sliced out of collection_url, not the one /profile returned.
    assert f'FROM <{COLLECTION_GRAPH}>' in members


@pytest.mark.parametrize('sbh_overwrite, overwrite_merge', [
    (True, 3), (1, 3), (False, 2), (0, 2),
])
def test_the_submit_merges_into_the_study(
    client, legacy_sbh, sbol_file, sbh_overwrite, overwrite_merge,
):
    synbiohub_answers(legacy_sbh)

    upload(client, sbol_file, sbh_overwrite=sbh_overwrite)

    [submit] = legacy_sbh.calls_matching('/submit')
    assert submit.headers['X-authorization'] == TOKEN
    assert submit.kwargs['data'] == {
        'rootCollections': STUDY_URI,
        'overwrite_merge': overwrite_merge,
    }


@pytest.mark.parametrize('import_type, homespace', [
    ('Devices', 'https://example.com/'),
    ('Plasmids', 'https://example.com/'),
    ('Designs', 'https://sbolcanvas.org/'),
    ('Models', 'https://sbolcanvas.org/'),
    ('Strains', 'https://synbiosuite.org/'),
])
def test_the_sub_collection_is_created_under_the_import_types_homespace(
    client, legacy_sbh, monkeypatch, sbol_file, import_type, homespace,
):
    synbiohub_answers(legacy_sbh)
    submitted = capture_submitted(legacy_sbh, monkeypatch)

    upload(client, sbol_file, importType=import_type)

    [body] = submitted
    collection = read_back(body).getCollection(f'{homespace}{import_type}/1')
    assert list(collection.members) == ['https://example.com/test_part/1']


def test_an_upload_leaves_no_temp_files(client, legacy_sbh, sbol_file, workdir):
    synbiohub_answers(legacy_sbh)

    upload(client, sbol_file)

    assert leftovers(workdir) == []
    assert leftovers(workdir / 'uploads') == []


# ----------------------------------------------------------- with an SBML file

def test_an_sbml_file_is_attached_and_linked_as_a_model(
    client, legacy_sbh, monkeypatch, design_file,
):
    synbiohub_answers(
        legacy_sbh,
        # Nothing to replace before the upload; the new attachment after it.
        attachment_lookup=[bindings(), bindings(ATTACHMENT_URI)],
    )
    submitted = capture_submitted(legacy_sbh, monkeypatch)
    attached = capture_attached(monkeypatch)

    response = upload(
        client, design_file, importType='Designs', sbml=raw_part(SBML, 'model.xml'),
    )

    assert response.status_code == 200
    assert response.get_json()['subCollectionUrl'] == f'{STUDY_ROOT}/circuit/1'
    assert requested(legacy_sbh) == [
        f'GET {SBH_URL}/profile',
        f'GET {SBH_URL}/sparql',   # is there an attachment to replace?
        f'POST {ATTACH_URL}',
        f'GET {SBH_URL}/sparql',   # where did the new one land?
        f'GET {SBH_URL}/sparql',   # the sub-collection's members
        f'POST {SBH_URL}/submit',
    ]
    assert attached == [('model.xml', SBML)]

    doc = read_back(submitted[0])
    [model] = doc.models
    assert model.identity == f'{CANVAS_HOMESPACE}model_xml/1'
    assert model.source == ATTACHMENT_URI
    assert list(model.attachments) == [ATTACHMENT_URI]
    assert model.language == 'http://identifiers.org/edam/format_2585'
    assert model.framework == 'http://identifiers.org/biomodels.sbo/SBO:0000062'
    [design] = doc.moduleDefinitions
    assert list(design.models) == [model.identity]


def test_the_attachment_is_looked_up_in_the_login_graph(client, legacy_sbh, design_file):
    """Wart, pinned: the attachment queries use the graph /profile returned,
    the member query the one sliced out of collection_url."""
    synbiohub_answers(
        legacy_sbh, attachment_lookup=[bindings(), bindings(ATTACHMENT_URI)],
    )

    upload(client, design_file, importType='Designs', sbml=raw_part(SBML, 'model.xml'))

    before, after, members = sparql_queries(legacy_sbh)
    assert 'dcterms:title "model.xml"' in before
    assert f'FROM <{LOGIN_GRAPH}>' in before
    assert f'FROM <{LOGIN_GRAPH}>' in after
    assert f'FROM <{COLLECTION_GRAPH}>' in members


def test_an_sbml_part_without_a_filename_is_ignored(client, legacy_sbh, sbol_file):
    synbiohub_answers(legacy_sbh)

    response = upload(client, sbol_file, sbml=raw_part(SBML, ''))

    assert response.status_code == 200
    assert legacy_sbh.calls_matching('/attach') == []


def test_an_attachment_synbiohub_cannot_find_again_is_a_500(
    client, legacy_sbh, caplog, design_file,
):
    """Wart, pinned: sourceUri is only bound inside the loop over the lookup's
    results, so an empty lookup raises -- after the file has been attached.
    Nothing anticipates that, so the caller learns only that it failed."""
    synbiohub_answers(legacy_sbh)  # every attachment lookup comes back empty

    response = upload(
        client, design_file, importType='Designs', sbml=raw_part(SBML, 'model.xml'),
    )

    assert response.status_code == 500
    assert response.get_json() == {'error': UNEXPECTED_FAILURE}
    assert 'sourceUri' in caplog.text
    assert len(legacy_sbh.calls_matching('/attach')) == 1
    assert legacy_sbh.calls_matching('/submit') == []


# ------------------------------------------------- rejected before any request

def assert_rejected(response, sbh, error):
    assert response.status_code == 400
    assert response.get_json() == {'error': error}
    assert sbh.calls == []


def test_no_sbol_part_is_400(client, legacy_sbh):
    response = post(client, URL, Params=params_part(PARAMS))

    assert_rejected(response, legacy_sbh, 'No SBOL file provided')


@pytest.mark.parametrize('sbol_name, error', [
    ('', 'No selected file'),
    ('part.txt', 'Invalid file format'),
    ('part', 'Invalid file format'),
    ('PART.XML', 'Invalid file format'),  # the extension check is case-sensitive
])
def test_an_sbol_file_must_be_named_dot_xml(client, legacy_sbh, sbol_file, sbol_name, error):
    response = upload(client, sbol_file, sbol_name=sbol_name)

    assert_rejected(response, legacy_sbh, error)


def test_no_params_part_is_400(client, legacy_sbh, sbol_file):
    response = post(client, URL, SBOL=file_part(sbol_file, 'part.xml'))

    assert_rejected(response, legacy_sbh, 'No Params file part')


def test_a_params_part_without_a_filename_is_400(client, legacy_sbh, sbol_file):
    response = post(
        client, URL,
        SBOL=file_part(sbol_file, 'part.xml'),
        Params=params_part(PARAMS, filename=''),
    )

    assert_rejected(response, legacy_sbh, 'No selected Params file')


@pytest.mark.parametrize('missing', REQUIRED)
def test_each_required_param_is_checked(client, legacy_sbh, sbol_file, missing):
    response = post(
        client, URL,
        SBOL=file_part(sbol_file, 'part.xml'),
        Params=params_part(without(PARAMS, missing)),
    )

    assert_rejected(response, legacy_sbh, f'Parameter {missing} not found in request')


def test_a_null_token_is_400(client, legacy_sbh, sbol_file):
    response = upload(client, sbol_file, sbh_token=None)

    assert_rejected(response, legacy_sbh, 'No SBH credentials provided')


def test_an_unusable_sbh_url_is_400(client, legacy_sbh, sbol_file):
    response = upload(client, sbol_file, sbh_url='ftp://synbiohub.org')

    assert_rejected(response, legacy_sbh, 'Invalid sbh_url: it must be an http(s) URL')


def test_the_token_is_checked_before_the_url(client, legacy_sbh, sbol_file):
    response = upload(client, sbol_file, sbh_token=None, sbh_url='ftp://synbiohub.org')

    assert_rejected(response, legacy_sbh, 'No SBH credentials provided')


# ------------------------------------------------------- unhandled, so a 500

def assert_unhandled(response, sbh):
    """Flask's own error page: nothing caught the exception."""
    assert response.status_code == 500
    assert response.mimetype == 'text/html'
    assert sbh.calls == []


def test_a_missing_import_type_is_unhandled(unhandled_client, legacy_sbh, sbol_file):
    """Wart, pinned: importType is read but is not in the required list."""
    response = post(
        unhandled_client, URL,
        SBOL=file_part(sbol_file, 'part.xml'),
        Params=params_part(without(PARAMS, 'importType')),
    )

    assert_unhandled(response, legacy_sbh)


def test_params_that_are_not_json_are_unhandled(unhandled_client, legacy_sbh, sbol_file):
    """Wart, pinned."""
    response = post(
        unhandled_client, URL,
        SBOL=file_part(sbol_file, 'part.xml'),
        Params=raw_part(b'{not json', 'parameters.json'),
    )

    assert_unhandled(response, legacy_sbh)


def test_a_null_collection_url_is_unhandled_before_login(
    unhandled_client, legacy_sbh, sbol_file,
):
    """Wart, pinned -- and it fails before SynBioHub is contacted at all."""
    response = upload(unhandled_client, sbol_file, collection_url=None)

    assert_unhandled(response, legacy_sbh)


# ------------------------------------------------------------ after the login

def test_a_failed_login_is_400(client, legacy_sbh, sbol_file):
    synbiohub_answers(legacy_sbh, profile=FakeResponse(401, text='bad token'))

    response = upload(client, sbol_file)

    assert response.status_code == 400
    assert response.get_json() == {
        'error': 'Error logging into SynBioHub: '
                 'Error accessing SynBioHub profile (401): bad token',
    }
    assert requested(legacy_sbh) == [f'GET {SBH_URL}/profile']


def test_an_unusable_sbml_file_name_is_400(client, legacy_sbh, sbol_file):
    """Checked after the login, like the SBOL file's own name."""
    synbiohub_answers(legacy_sbh)

    response = upload(client, sbol_file, sbml=raw_part(SBML, '...'))

    assert response.status_code == 400
    assert response.mimetype == 'application/json'
    assert response.get_json() == {'error': 'Invalid SBML file name'}
    assert requested(legacy_sbh) == [f'GET {SBH_URL}/profile']


def test_a_rejected_submit_is_a_500_that_says_why(
    client, legacy_sbh, sbol_file, workdir,
):
    """Wart, pinned: SynBioHub saying no is a 500 here, where the XDC routes
    answer 400."""
    synbiohub_answers(legacy_sbh, submit=FakeResponse(401, text='Unauthorized'))

    response = upload(client, sbol_file)

    assert response.status_code == 500
    assert response.get_json() == {
        'error': 'SynBioHub submit failed (401): Unauthorized',
    }
    assert leftovers(workdir / 'uploads') == []


def test_a_failed_member_query_is_a_500_that_says_why(client, legacy_sbh, sbol_file):
    synbiohub_answers(legacy_sbh, members=FakeResponse(500, text='boom'))

    response = upload(client, sbol_file)

    assert response.status_code == 500
    assert response.get_json() == {
        'error': 'SynBioHub sparql query failed (500): boom',
    }


def test_a_rejected_sbml_attachment_is_a_500_that_says_why(
    client, legacy_sbh, design_file,
):
    synbiohub_answers(legacy_sbh, attach=FakeResponse(500, text='no room'))

    response = upload(
        client, design_file, importType='Designs', sbml=raw_part(SBML, 'model.xml'),
    )

    assert response.status_code == 500
    assert response.get_json() == {
        'error': 'Uploading attachments to SynBioHub failed (500): no room',
    }


@pytest.mark.parametrize('failure', [
    requests.exceptions.ConnectionError('connection refused'),
    requests.exceptions.ReadTimeout('timed out'),
    BlockedDestinationError('Refusing to connect to x: it resolves to a non-public address'),
])
def test_a_synbiohub_that_cannot_be_reached_is_a_500_that_says_why(
    client, legacy_sbh, sbol_file, failure,
):
    synbiohub_answers(legacy_sbh, submit=failure)

    response = upload(client, sbol_file)

    assert response.status_code == 500
    assert response.get_json() == {'error': str(failure)}


def test_a_file_that_is_not_xml_is_a_500_that_says_where_it_went_wrong(
    client, legacy_sbh, tmp_path,
):
    """The parser's own message starts with the path of the temp file on this
    server; the caller gets the reason and the position, not the path."""
    synbiohub_answers(legacy_sbh)
    junk = tmp_path / 'junk.xml'
    junk.write_text('this is not SBOL')

    response = upload(client, junk)

    assert response.status_code == 500
    assert response.get_json() == {
        'error': 'Could not parse the SBOL file: syntax error (line 1, column 0)',
    }
    assert requested(legacy_sbh) == [f'GET {SBH_URL}/profile']


def test_a_document_sbol2_rejects_is_a_500_carrying_its_message(
    client, legacy_sbh, tmp_path,
):
    """A file that already holds the sub-collection's URI -- an export of this
    very collection, say -- cannot have that sub-collection added to it."""
    synbiohub_answers(legacy_sbh)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_COMPLIANT_URIS, True)
    sbol2.Config.setOption(sbol2.ConfigOptions.SBOL_TYPED_URIS, False)
    sbol2.setHomespace('https://example.com/')
    doc = sbol2.Document()
    doc.addComponentDefinition(sbol2.ComponentDefinition('test_part'))
    doc.addCollection(sbol2.Collection('Devices'))
    exported = tmp_path / 'exported.xml'
    with sbol_validation_disabled():
        doc.write(str(exported))

    response = upload(client, exported)

    assert response.status_code == 500
    body = response.get_json()
    assert set(body) == {'error'}
    assert 'already contained in the Document' in body['error']
    assert legacy_sbh.calls_matching('/submit') == []


def test_an_unexpected_failure_tells_the_caller_nothing_about_it(
    client, legacy_sbh, caplog, sbol_file,
):
    """Here, a collection URL too short to carry a version segment."""
    synbiohub_answers(legacy_sbh)

    response = upload(
        client, sbol_file, collection_url='https://synbiohub.org/user/pmeka12/Test',
    )

    assert response.status_code == 500
    assert response.get_json() == {'error': UNEXPECTED_FAILURE}
    assert 'IndexError' in caplog.text
    assert legacy_sbh.calls_matching('/submit') == []


def test_an_attribute_error_is_a_400(client, legacy_sbh, monkeypatch, sbol_file):
    """Wart, pinned: any AttributeError while the document is handled is
    answered as the caller's mistake."""
    synbiohub_answers(legacy_sbh)

    def read(self, path):
        raise AttributeError("'NoneType' object has no attribute 'identity'")

    monkeypatch.setattr(sbol2.Document, 'read', read)

    response = upload(client, sbol_file)

    assert response.status_code == 400
    assert response.get_json() == {
        'error': "'NoneType' object has no attribute 'identity'",
    }
