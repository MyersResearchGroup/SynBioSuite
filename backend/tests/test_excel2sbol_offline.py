"""utils.excel2sbol_offline.

excel2sbol fetches URLs named in workbook cells, looks displayIds up on the
welcome sheet's Domain, and keeps per-run state in os.environ that outlives the
request. None of that may happen during a conversion, or survive one (review
DEFERRED, excel2sbol).
"""
import contextlib
import http.client
import os
import socket
import time
import urllib.error
import urllib.request
from unittest import mock

import excel2sbol
import pytest
import requests
import tyto
from requests.adapters import HTTPAdapter
from SPARQLWrapper.SPARQLExceptions import QueryBadFormed

from sbs_server.app import sbh_http, utils
from sbs_server.app.utils import (
    OntologyLookupError, WorkbookNetworkError, excel2sbol_offline,
)

RUN_ENV = ('COUNTER', 'SBOL_DICTIONARY')
UNROUTABLE = '192.0.2.1'  # TEST-NET-1 (RFC 5737): nothing answers there
E_COLI = 'http://purl.obolibrary.org/obo/NCBITaxon_562'


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
        socket.getaddrinfo,
        socket.socket.connect,
        socket.socket.connect_ex,
        tyto.endpoint.Ontobee.get_uri_by_term,
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


# ------------------------------------------------ every other route out (M1)
# tyto answers a "Tyto Lookup" column by querying Ontobee through SPARQLWrapper,
# i.e. urllib, which HTTPAdapter.send never sees -- and it sets no timeout. So
# the guard also works at socket level: Ontobee is the one host a conversion may
# reach, under a timeout and a budget; nothing else resolves or connects.

def test_urllib_cannot_leave_the_process_during_conversion(listener):
    with excel2sbol_offline():
        with pytest.raises(WorkbookNetworkError, match='127.0.0.1'):
            urllib.request.urlopen(listener.url, timeout=2)

    assert listener.received() == b''


def test_other_hosts_are_refused_before_any_dns_lookup(monkeypatch):
    """A workbook-chosen name must not even reach the resolver."""
    looked_up = []

    def resolver(host, *args, **kwargs):
        looked_up.append(host)
        raise socket.gaierror('this test does no real DNS')

    monkeypatch.setattr(socket, 'getaddrinfo', resolver)

    with excel2sbol_offline():
        with pytest.raises(WorkbookNetworkError, match='sbh.example.org'):
            urllib.request.urlopen('http://sbh.example.org/', timeout=2)

    assert looked_up == []


@pytest.mark.parametrize('method', ['connect', 'connect_ex'])
def test_a_connect_that_skips_dns_is_refused(method):
    with excel2sbol_offline(), socket.socket() as sock:
        sock.settimeout(1)
        with pytest.raises(WorkbookNetworkError, match=UNROUTABLE):
            getattr(sock, method)((UNROUTABLE, 80))


@pytest.fixture
def loopback_ontobee(monkeypatch):
    """Let 127.0.0.1 stand in for Ontobee, public-address check included."""
    monkeypatch.setattr(utils, 'ONTOBEE_HOST', '127.0.0.1')
    monkeypatch.setattr(sbh_http, 'is_public_address', lambda address: True)


def test_ontobee_gets_a_timeout_even_when_the_caller_sets_none(
    listener, loopback_ontobee, monkeypatch,
):
    """SPARQLWrapper sets none, so a silent Ontobee held the worker until harakiri."""
    monkeypatch.setattr(utils, 'ONTOBEE_TIMEOUT', 0.5)
    started = time.monotonic()

    with excel2sbol_offline():
        # URLError or a bare TimeoutError, depending on where urllib was waiting.
        with pytest.raises(OSError, match='timed out'):
            urllib.request.urlopen(listener.url)  # no timeout, as SPARQLWrapper calls it

    assert time.monotonic() - started < 5


def test_no_ontobee_connection_starts_once_the_budget_is_spent(
    listener, loopback_ontobee, monkeypatch,
):
    monkeypatch.setattr(utils, 'ONTOBEE_BUDGET', 0)

    with excel2sbol_offline():
        with pytest.raises(OntologyLookupError, match='Ontobee'):
            urllib.request.urlopen(listener.url, timeout=2)

    assert listener.received() == b''


def test_ontobee_on_a_non_public_address_is_refused(listener, monkeypatch):
    """Its name is fixed, but its DNS answer is not ours to trust."""
    monkeypatch.setattr(utils, 'ONTOBEE_HOST', '127.0.0.1')

    with excel2sbol_offline():
        with pytest.raises(WorkbookNetworkError, match='non-public'):
            urllib.request.urlopen(listener.url, timeout=2)

    assert listener.received() == b''


def fake_ontobee(monkeypatch, answer=E_COLI):
    """Replace Ontobee's lookup before the guard wraps it; return the terms asked."""
    asked = []

    def get_uri_by_term(ontology, term):
        asked.append(term)
        if isinstance(answer, BaseException):
            raise answer
        return answer

    monkeypatch.setattr(tyto.endpoint.Ontobee, 'get_uri_by_term', get_uri_by_term)
    return asked


def look_up_e_coli():
    return tyto.endpoint.Ontobee.get_uri_by_term(tyto.NCBITaxon, 'Escherichia coli')


def test_each_term_is_looked_up_once_per_conversion(monkeypatch):
    """A workbook names the same organism on every row; one query answers them all."""
    asked = fake_ontobee(monkeypatch)

    with excel2sbol_offline():
        answers = [look_up_e_coli(), look_up_e_coli()]

    assert answers == [E_COLI, E_COLI]
    assert asked == ['Escherichia coli']


def test_lookups_are_not_remembered_between_conversions(monkeypatch):
    asked = fake_ontobee(monkeypatch)

    for _ in range(2):
        with excel2sbol_offline():
            look_up_e_coli()

    assert len(asked) == 2


@pytest.mark.parametrize('failure', [
    urllib.error.URLError(socket.timeout('timed out')),
    socket.timeout('timed out'),
    http.client.IncompleteRead(b''),
])
def test_an_ontobee_that_fails_is_an_ontology_lookup_error(monkeypatch, failure):
    fake_ontobee(monkeypatch, failure)

    with excel2sbol_offline():
        with pytest.raises(OntologyLookupError, match='Ontobee'):
            look_up_e_coli()


def test_a_query_ontobee_rejects_is_left_as_it_is(monkeypatch):
    """A malformed term is the workbook's problem, not an outage."""
    fake_ontobee(monkeypatch, QueryBadFormed('bad query'))

    with excel2sbol_offline():
        with pytest.raises(QueryBadFormed):
            look_up_e_coli()
