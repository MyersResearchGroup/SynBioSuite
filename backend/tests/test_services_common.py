"""services/common.py: the request plumbing the legacy services share."""
import io
import json
import os

import pytest
from werkzeug.datastructures import FileStorage, MultiDict

from sbs_server.app.errors import ApiError
from sbs_server.app.sbh_http import BlockedDestinationError
from sbs_server.app.services import common

from conftest import TOKEN, FakeResponse
from legacy_helpers import (
    LOGIN_GRAPH,
    SBH_URL,
    SBH_USER,
    UUID_PREFIX_LENGTH,
    logged_in,
)


def files_with(params, filename='parameters.json'):
    body = params if isinstance(params, bytes) else json.dumps(params).encode()
    return MultiDict({'Params': FileStorage(stream=io.BytesIO(body), filename=filename)})


def leftovers_named(path):
    """A temp file's name without its uuid prefix."""
    return os.path.basename(path)[UUID_PREFIX_LENGTH:]


# ---------------------------------------------------------------- read_params

def test_read_params_returns_the_parsed_part():
    params = common.read_params(files_with({'a': 1, 'b': None}), ['a', 'b'])

    assert params == {'a': 1, 'b': None}


def test_read_params_without_the_part_is_400():
    with pytest.raises(ApiError) as excinfo:
        common.read_params(MultiDict(), ['a'])

    assert (excinfo.value.status, excinfo.value.message) == (400, 'No Params file part')


def test_read_params_without_a_filename_is_400():
    with pytest.raises(ApiError) as excinfo:
        common.read_params(files_with({'a': 1}, filename=''), ['a'])

    assert (excinfo.value.status, excinfo.value.message) == (400, 'No selected Params file')


def test_read_params_names_the_first_missing_key():
    with pytest.raises(ApiError) as excinfo:
        common.read_params(files_with({'a': 1}), ['a', 'b', 'c'])

    assert (excinfo.value.status, excinfo.value.message) == (
        400, 'Parameter b not found in request',
    )


def test_read_params_accepts_a_key_whose_value_is_null():
    """Present is enough; each service decides what a null means."""
    assert common.read_params(files_with({'a': None}), ['a']) == {'a': None}


def test_read_params_does_not_catch_invalid_json():
    """Wart, pinned: the routes answer this with Flask's own 500."""
    with pytest.raises(ValueError):
        common.read_params(files_with(b'{not json'), ['a'])


# --------------------------------------------------------------- sbh_base_url

@pytest.mark.parametrize('given, canonical', [
    ('https://api.synbiohub.org', 'https://api.synbiohub.org'),
    ('https://api.synbiohub.org/', 'https://api.synbiohub.org'),
    ('api.synbiohub.org', 'https://api.synbiohub.org'),
])
def test_sbh_base_url_is_canonical(given, canonical):
    assert common.sbh_base_url({'sbh_url': given}) == canonical


@pytest.mark.parametrize('given, reason', [
    ('ftp://synbiohub.org', 'it must be an http(s) URL'),
    ('https://synbiohub.org/?x=1', 'it must not contain a query string or fragment'),
    (None, 'a SynBioHub URL is required'),
])
def test_an_unusable_sbh_url_is_400(given, reason):
    with pytest.raises(ApiError) as excinfo:
        common.sbh_base_url({'sbh_url': given})

    assert (excinfo.value.status, excinfo.value.message) == (
        400, f'Invalid sbh_url: {reason}',
    )


# ------------------------------------------------------------ overwrite_merge

@pytest.mark.parametrize('params, expected', [
    ({'sbh_overwrite': True}, 3),
    ({'sbh_overwrite': 1}, 3),
    ({}, 3),
    ({'sbh_overwrite': False}, 2),
    ({'sbh_overwrite': 0}, 2),
    ({'sbh_overwrite': None}, 2),
])
def test_overwrite_merge_follows_sbh_overwrite(params, expected):
    assert common.overwrite_merge(params) == expected


# ------------------------------------------------------------ upload_workspace

def test_a_workspace_hands_out_unique_paths_under_uploads(workdir):
    with common.upload_workspace() as workspace:
        first = workspace.path('part.xml')
        second = workspace.path('part.xml')

    uploads = str(workdir / 'uploads')
    assert os.path.isdir(uploads)
    assert first != second
    assert {os.path.dirname(first), os.path.dirname(second)} == {uploads}
    assert leftovers_named(first) == leftovers_named(second) == 'part.xml'


def test_a_workspace_removes_its_files_on_the_way_out(workdir):
    with common.upload_workspace() as workspace:
        path = workspace.path('part.xml')
        open(path, 'w').close()
        assert os.path.exists(path)

    assert os.listdir(workdir / 'uploads') == []


def test_a_workspace_removes_its_files_when_the_work_fails(workdir):
    with pytest.raises(RuntimeError):
        with common.upload_workspace() as workspace:
            open(workspace.path('part.xml'), 'w').close()
            raise RuntimeError('the upload went wrong')

    assert os.listdir(workdir / 'uploads') == []


def test_a_path_that_was_never_written_is_not_a_problem(workdir):
    with common.upload_workspace() as workspace:
        workspace.path('never_written.xml')

    assert os.listdir(workdir / 'uploads') == []


def test_a_file_that_cannot_be_removed_does_not_fail_the_request(workdir, capsys):
    with common.upload_workspace() as workspace:
        path = workspace.path('stuck')
        os.mkdir(path)  # os.remove refuses a directory

    assert 'failed to remove temporary file' in capsys.readouterr().out


def test_a_workspace_leaves_other_requests_files_alone(workdir):
    os.mkdir(workdir / 'uploads')
    other = workdir / 'uploads' / 'someone_elses.xml'
    other.write_text('still in use')

    with common.upload_workspace() as workspace:
        open(workspace.path('part.xml'), 'w').close()

    assert os.listdir(workdir / 'uploads') == ['someone_elses.xml']


# ---------------------------------------------------------------------- login

def test_login_returns_the_profile(legacy_sbh):
    legacy_sbh.register('GET', '/profile', logged_in())

    user = common.login(SBH_URL, TOKEN)

    assert user == common.SbhUser(name=SBH_USER, graph=LOGIN_GRAPH)
    [call] = legacy_sbh.calls
    assert call.url == f'{SBH_URL}/profile'
    assert call.headers['X-authorization'] == TOKEN


def test_a_rejected_token_is_400(legacy_sbh):
    legacy_sbh.register('GET', '/profile', FakeResponse(401, text='bad token'))

    with pytest.raises(ApiError) as excinfo:
        common.login(SBH_URL, TOKEN)

    assert (excinfo.value.status, excinfo.value.message) == (
        400,
        'Error logging into SynBioHub: Error accessing SynBioHub profile (401): bad token',
    )


def test_a_refused_destination_is_400_too(legacy_sbh):
    legacy_sbh.register(
        'GET', '/profile',
        BlockedDestinationError('Refusing to connect to x: it resolves to a non-public address'),
    )

    with pytest.raises(ApiError) as excinfo:
        common.login(SBH_URL, TOKEN)

    assert excinfo.value.status == 400
    assert 'non-public' in excinfo.value.message
