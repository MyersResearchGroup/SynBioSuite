"""conftest._block_network: no test reaches a real server, whatever library it uses.

Patching requests.get/post alone missed urllib -- the route tyto's Ontobee
lookups take through SPARQLWrapper -- plus requests.Session and raw sockets
(review M1). The block now sits at socket connect.
"""
import socket
import urllib.request

import pytest
import requests

UNROUTABLE = '192.0.2.1'  # TEST-NET-1 (RFC 5737): nothing answers there


def test_urllib_is_blocked(_block_network):
    with pytest.raises(AssertionError, match='real network connection'):
        urllib.request.urlopen(f'http://{UNROUTABLE}/', timeout=1)

    assert _block_network == [(UNROUTABLE, 80)]
    _block_network.clear()  # expected here; any other attempt fails the test


def test_a_requests_session_is_blocked(_block_network):
    with requests.Session() as session:
        with pytest.raises(AssertionError, match='real network connection'):
            session.get(f'http://{UNROUTABLE}/', timeout=1)

    assert _block_network == [(UNROUTABLE, 80)]
    _block_network.clear()


def test_loopback_stays_open(_block_network, listener):
    """The Listener tests need it: they check what reached a local port."""
    with socket.create_connection(('127.0.0.1', listener.port), timeout=2):
        pass

    assert _block_network == []
