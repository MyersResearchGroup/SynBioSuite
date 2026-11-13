"""sbol2 keeps its homespace in one process-global setting; uploads on
different threads must not build objects under each other's.

uwsgi runs one request per worker, but `flask run` is threaded by default.
An upload sets the homespace, reads or converts its file, and only later
creates the sub-collection under whatever the homespace is by then.
"""
import shutil
import threading

import pytest
import sbol2

from sbs_server.app import utils
from sbs_server.app.api import views
from sbs_server.app.services import sbol_upload, xdc

from conftest import (TOKEN, STUDY_URI, FakeResponse, auth_headers,
                      capture_submitted, existing_study)
from legacy_helpers import (SBH_PREFIX, SBH_URL, file_part, params_part, post,
                            raw_part, synbiohub_answers)

EXAMPLE_HOMESPACE = 'https://example.com/'
CANVAS_HOMESPACE = 'https://sbolcanvas.org/'

# How long the first upload stands still, homespace set, for the second to
# overtake it. With the lock in place the second cannot, so this is also what
# each threaded test costs.
OVERTAKE_SECONDS = 0.5
THREAD_TIMEOUT_SECONDS = 30
PROBE_SECONDS = 0.05

LEGACY_PARAMS = {
    'sbh_url': SBH_URL,
    'sbh_prefix': SBH_PREFIX,
    'sbh_token': TOKEN,
    'collection_url': STUDY_URI,
    'sbh_overwrite': True,
}
XDC_PARAMS = {
    **LEGACY_PARAMS,
    'fj_url': None,
    'fj_token': None,
    'fj_study_id': None,
    'fj_overwrite': 1,
    'importType': 'Resources',
}


class Overtake:
    """Make the second of two uploads read its file while the first has read
    its own but not yet built on it.

    `staged(read)` wraps the function an upload reads its file with; each
    thread says which upload it is with `as_first()` or `as_second()`.
    """

    def __init__(self):
        self._role = threading.local()
        self._first_has_read = threading.Event()
        self._second_has_read = threading.Event()

    def as_first(self):
        self._role.name = 'first'

    def as_second(self):
        self._role.name = 'second'
        self._first_has_read.wait(THREAD_TIMEOUT_SECONDS)

    def staged(self, read):
        def wrapper(*args, **kwargs):
            result = read(*args, **kwargs)
            if self._role.name == 'first':
                self._first_has_read.set()
                self._second_has_read.wait(OVERTAKE_SECONDS)
            else:
                self._second_has_read.set()
            return result
        return wrapper


def run_overtaking(first, second, overtake):
    """Run the two uploads on their own threads; returns their results."""
    results = {}

    def run(name, take_role, upload):
        take_role()
        results[name] = upload()

    threads = [
        threading.Thread(target=run, args=('first', overtake.as_first, first)),
        threading.Thread(target=run, args=('second', overtake.as_second, second)),
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(THREAD_TIMEOUT_SECONDS)
    return results['first'], results['second']


def sub_collections(bodies):
    """The identity of every Collection in the submitted documents."""
    identities = []
    for body in bodies:
        doc = sbol2.Document()
        doc.readString(body)
        identities.extend(collection.identity for collection in doc.collections)
    return sorted(identities)


def refused_to_another_thread() -> bool:
    """Whether the sbol2 lock is held, as seen from a thread that does not hold it."""
    refused = []

    def probe():
        acquired = utils.SBOL2_LOCK.acquire(timeout=PROBE_SECONDS)
        if acquired:
            utils.SBOL2_LOCK.release()
        refused.append(not acquired)

    thread = threading.Thread(target=probe)
    thread.start()
    thread.join()
    return refused[0]


# ------------------------------------------------------------ threaded uploads

def test_threaded_api_uploads_each_keep_their_own_homespace(
    app, fake_sbh, monkeypatch, sbol_file, workdir,
):
    fake_sbh.register('GET', '/metadata', existing_study())
    fake_sbh.register('GET', '/sparql',
                      FakeResponse(200, json_data={'results': {'bindings': []}}))
    fake_sbh.register('POST', '/submit', FakeResponse(200, text='Successfully uploaded'))
    submitted = capture_submitted(fake_sbh, monkeypatch)
    overtake = Overtake()
    monkeypatch.setattr(views, 'load_document', overtake.staged(views.load_document))

    def upload(path):
        with open(sbol_file, 'rb') as handle:
            return app.test_client().post(
                f'/api/v1/{path}',
                headers=auth_headers(),
                data={'file': (handle, 'part.xml')},
                content_type='multipart/form-data',
            )

    devices, designs = run_overtaking(
        lambda: upload('devices'), lambda: upload('designs'), overtake,
    )

    assert (devices.status_code, designs.status_code) == (201, 201)
    assert sub_collections(submitted) == [
        f'{EXAMPLE_HOMESPACE}Devices/1',
        f'{CANVAS_HOMESPACE}Designs/1',
    ]


def test_threaded_legacy_uploads_each_keep_their_own_homespace(
    app, legacy_sbh, monkeypatch, sbol_file, workdir,
):
    synbiohub_answers(legacy_sbh)
    submitted = capture_submitted(legacy_sbh, monkeypatch)
    overtake = Overtake()
    monkeypatch.setattr(
        sbol_upload, '_read_document', overtake.staged(sbol_upload._read_document),
    )

    def upload(import_type):
        return post(
            app.test_client(),
            '/api/uploadSBOL',
            SBOL=file_part(sbol_file, 'part.xml'),
            Params=params_part({**LEGACY_PARAMS, 'importType': import_type}),
        )

    devices, designs = run_overtaking(
        lambda: upload('Devices'), lambda: upload('Designs'), overtake,
    )

    assert (devices.status_code, designs.status_code) == (200, 200)
    assert sub_collections(submitted) == [
        f'{EXAMPLE_HOMESPACE}Devices/1',
        f'{CANVAS_HOMESPACE}Designs/1',
    ]


# ------------------------------------------------- what else the lock must cover

def test_excel_conversion_runs_with_the_lock_held(monkeypatch, sbol_file, tmp_path):
    """excel2sbol sets the homespace itself and builds every object under it."""
    seen = []

    def converter(file_path_in, file_path_out, homespace, sbol_version):
        seen.append(refused_to_another_thread())
        shutil.copy(sbol_file, file_path_out)

    monkeypatch.setattr(utils.excel2sbol, 'converter', converter)

    utils.convert_to_sbol('workbook.xlsx', str(tmp_path / 'out.xml'), 'https://example.org/')

    assert seen == [True]


def test_a_workbook_upload_holds_the_lock_from_conversion_to_submission(
    client, legacy_sbh, monkeypatch, workdir,
):
    """The sub-collection is created under the homespace the conversion left."""
    synbiohub_answers(legacy_sbh)
    seen = []

    def upload_to_sbh(*args, **kwargs):
        seen.append(refused_to_another_thread())
        return 'https://synbiohub.org/user/pmeka12/Test/Resources/1'

    monkeypatch.setattr(xdc, 'convert_to_sbol', lambda *args: sbol2.Document())
    monkeypatch.setattr(xdc, 'upload_to_sbh', upload_to_sbh)

    response = post(
        client,
        '/api/uploadResource',
        Metadata=raw_part(b'never read', 'resources.xlsx'),
        Params=params_part(XDC_PARAMS),
    )

    assert response.status_code == 200, response.get_data(as_text=True)
    assert seen == [True]


def test_the_lock_is_free_again_after_an_upload(client, legacy_sbh, sbol_file, workdir):
    synbiohub_answers(legacy_sbh)

    post(
        client,
        '/api/uploadSBOL',
        SBOL=file_part(sbol_file, 'part.xml'),
        Params=params_part({**LEGACY_PARAMS, 'importType': 'Devices'}),
    )

    assert not refused_to_another_thread()


@pytest.mark.parametrize('failure', [RuntimeError('boom'), SystemExit(1)])
def test_the_lock_is_released_when_conversion_fails(monkeypatch, tmp_path, failure):
    def converter(file_path_in, file_path_out, homespace, sbol_version):
        raise failure

    monkeypatch.setattr(utils.excel2sbol, 'converter', converter)

    with pytest.raises(RuntimeError):
        utils.convert_to_sbol('workbook.xlsx', str(tmp_path / 'out.xml'), 'https://example.org/')

    assert not refused_to_another_thread()
