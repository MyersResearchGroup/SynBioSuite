"""utils.excel2sbol_offline.

excel2sbol fetches URLs named in workbook cells, looks displayIds up on the
welcome sheet's Domain, and keeps per-run state in os.environ that outlives the
request. None of that may happen during a conversion, or survive one (review
DEFERRED, excel2sbol).
"""
import contextlib
import os
from unittest import mock

import excel2sbol
import pytest
import requests
from requests.adapters import HTTPAdapter

from sbs_server.app.utils import WorkbookNetworkError, excel2sbol_offline

RUN_ENV = ('COUNTER', 'SBOL_DICTIONARY')


@pytest.fixture(autouse=True)
def _isolate_env():
    """A guard that failed to clear its keys must not leak them into other tests."""
    with mock.patch.dict(os.environ):
        yield


def replaced_attributes():
    return (
        excel2sbol.library2.link_validation,
        excel2sbol.compiler.initialise_welcome,
        HTTPAdapter.send,
    )


def test_no_request_leaves_the_process_during_conversion(listener):
    """The backstop for anything the stubs miss, today or after a version bump.

    requests.Session is not what _block_network patches, so without the guard
    this would reach the loopback listener.
    """
    with excel2sbol_offline(), requests.Session() as session:
        with pytest.raises(WorkbookNetworkError, match='127.0.0.1'):
            session.get(listener.url, timeout=2)

    assert listener.received() == b''


def test_link_checks_and_the_welcome_sheet_are_switched_off():
    with excel2sbol_offline():
        assert excel2sbol.library2.link_validation(
            None, None, None, 'https://sbh.example.org/seq') is True
        assert excel2sbol.compiler.initialise_welcome({'welcome': {}}, 'x.xlsx') is None


def test_excel2sbol_state_is_cleared_on_the_way_in(monkeypatch):
    monkeypatch.setenv('COUNTER', 'Error found')
    monkeypatch.setenv('SBOL_DICTIONARY', '{"Domain": "https://sbh.example.org"}')

    with excel2sbol_offline():
        assert not set(RUN_ENV) & set(os.environ)


@pytest.mark.parametrize('conversion_fails', [False, True])
def test_the_guard_puts_everything_back(conversion_fails):
    before = replaced_attributes()

    with contextlib.suppress(RuntimeError):
        with excel2sbol_offline():
            os.environ['COUNTER'] = 'Error found'
            os.environ['SBOL_DICTIONARY'] = '{}'
            if conversion_fails:
                raise RuntimeError('conversion blew up')

    assert replaced_attributes() == before
    assert not set(RUN_ENV) & set(os.environ)
