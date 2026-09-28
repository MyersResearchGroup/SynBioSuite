"""sbh_http: the SSRF guard every SynBioHub call goes through (review H5).

The guard tests talk to real sockets on loopback -- that is the point: they
prove a blocked connection is dropped before a single byte (request line,
X-authorization token, TLS ClientHello) leaves the process. They call
sbh_http.request directly, because the autouse network block patches only
sbh_http.get/post.
"""
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from sbs_server.app import sbh_http, synbiohubUpload, utils
from sbs_server.app.api import sbh as api_sbh
from sbs_server.app.sbh_http import (
    SBH_URL_ENV,
    BlockedDestinationError,
    is_public_address,
    normalise_base_url,
    rebase_uri,
)

REQUEST_TIMEOUT = (2, 2)


# ------------------------------------------------------------ address policy

@pytest.mark.parametrize(
    'address',
    [
        '169.254.169.254',   # cloud metadata
        '127.0.0.1',
        '10.0.0.5',
        '172.16.0.1',
        '192.168.1.1',
        '100.64.0.1',        # carrier-grade NAT
        '0.0.0.0',
        '224.0.0.1',         # multicast
        '::1',
        '::',
        'fe80::1',
        'fc00::1',
        '::ffff:127.0.0.1',  # IPv4-mapped loopback
        '::ffff:169.254.169.254',
        '64:ff9b::a9fe:a9fe',  # NAT64 well-known prefix + 169.254.169.254
        '64:ff9b::7f00:1',     # NAT64 + 127.0.0.1
        '::ffff:0:c0a8:101',   # IPv4-translated (RFC 2765) + 192.168.1.1
    ],
)
def test_internal_addresses_are_not_public(address):
    assert not is_public_address(address)


@pytest.mark.parametrize(
    'address', ['8.8.8.8', '2606:4700:4700::1111', '::ffff:8.8.8.8', '64:ff9b::808:808'],
)
def test_internet_addresses_are_public(address):
    assert is_public_address(address)


# ----------------------------------------------------------- base URL syntax

@pytest.mark.parametrize(
    'given, expected',
    [
        ('api.synbiohub.org', 'https://api.synbiohub.org'),
        ('https://api.synbiohub.org/', 'https://api.synbiohub.org'),
        ('  https://api.synbiohub.org  ', 'https://api.synbiohub.org'),
        ('http://localhost:7777/', 'http://localhost:7777'),
        ('https://sbh.example.org/sbh/', 'https://sbh.example.org/sbh'),
    ],
)
def test_base_urls_are_normalised(given, expected):
    assert normalise_base_url(given) == expected


@pytest.mark.parametrize(
    'url',
    [
        # The review's reproduction: a trailing ? turns every appended path
        # into a query string, so the caller picks the whole target URL.
        'http://169.254.169.254/latest/meta-data?x=',
        'https://api.synbiohub.org?',
        'https://api.synbiohub.org#fragment',
        'https://user:secret@api.synbiohub.org',
        'https://api.synbiohub.org@evil.example',
        'ftp://api.synbiohub.org',
        'https://',
        '',
        '   ',
        'https://api.synbiohub.org:notaport',
        None,                # a JSON null in the legacy Params file
    ],
)
def test_malformed_base_urls_are_rejected(url):
    with pytest.raises(ValueError):
        normalise_base_url(url)


def test_rebase_keeps_only_the_resource_path():
    """A URI from SPARQL results is data, so only its path may be kept."""
    assert rebase_uri(
        'https://api.synbiohub.org',
        'http://169.254.169.254/user/u/S/part/1',
    ) == 'https://api.synbiohub.org/user/u/S/part/1'


# ----------------------------------------------------- connect-time guard

class _Handler(BaseHTTPRequestHandler):
    redirect_to = None

    def do_GET(self):
        if self.path == '/redirect' and self.redirect_to:
            self.send_response(302)
            self.send_header('Location', self.redirect_to)
        else:
            self.send_response(200)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def log_message(self, *args):
        pass


@pytest.fixture
def http_server():
    handler = type('Handler', (_Handler,), {})
    server = HTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    server.handler = handler
    yield server
    server.shutdown()
    server.server_close()


@pytest.mark.parametrize('scheme, host', [
    ('http', '127.0.0.1'),
    ('http', 'localhost'),   # a name that resolves to loopback
    ('https', '127.0.0.1'),  # refused before the TLS handshake starts
])
def test_a_loopback_destination_is_refused_before_any_byte_is_sent(
    listener, scheme, host,
):
    with pytest.raises(BlockedDestinationError):
        sbh_http.request(
            'GET', f'{scheme}://{host}:{listener.port}/profile',
            headers={'X-authorization': 'secret-token'},
            timeout=REQUEST_TIMEOUT,
        )

    assert listener.received() == b''


def test_the_error_names_the_host_but_not_the_address(listener):
    with pytest.raises(BlockedDestinationError) as excinfo:
        sbh_http.request('GET', f'http://localhost:{listener.port}/',
                         timeout=REQUEST_TIMEOUT)

    assert 'localhost' in str(excinfo.value)
    assert '127.0.0.1' not in str(excinfo.value)


def test_the_operator_configured_origin_is_trusted(http_server, monkeypatch):
    """SBS_SBH_URL is operator config: it lets a local SynBioHub work in dev."""
    port = http_server.server_address[1]
    monkeypatch.setenv(SBH_URL_ENV, f'http://127.0.0.1:{port}')

    response = sbh_http.request('GET', f'http://127.0.0.1:{port}/profile',
                                timeout=REQUEST_TIMEOUT)

    assert response.status_code == 200


def test_trust_covers_that_origin_only(http_server, listener, monkeypatch):
    port = http_server.server_address[1]
    monkeypatch.setenv(SBH_URL_ENV, f'http://127.0.0.1:{port}')

    with pytest.raises(BlockedDestinationError):
        sbh_http.request('GET', f'http://127.0.0.1:{listener.port}/',
                         timeout=REQUEST_TIMEOUT)

    assert listener.received() == b''


def test_every_redirect_hop_is_checked(http_server, listener, monkeypatch):
    port = http_server.server_address[1]
    monkeypatch.setenv(SBH_URL_ENV, f'http://127.0.0.1:{port}')
    http_server.handler.redirect_to = f'http://localhost:{listener.port}/'

    with pytest.raises(BlockedDestinationError):
        sbh_http.request('GET', f'http://127.0.0.1:{port}/redirect',
                         timeout=REQUEST_TIMEOUT)

    assert listener.received() == b''


def test_a_proxy_env_var_cannot_route_around_the_guard(listener, monkeypatch):
    """requests sends proxied requests through its own pool manager; left to
    honour HTTP_PROXY, the guard would only ever see the proxy."""
    for name in ('NO_PROXY', 'no_proxy'):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv('HTTP_PROXY', 'http://proxy.invalid:3128')

    with pytest.raises(BlockedDestinationError):
        sbh_http.request('GET', f'{listener.url}/', timeout=REQUEST_TIMEOUT)

    assert listener.received() == b''


@pytest.mark.parametrize('module', [utils, synbiohubUpload, api_sbh])
def test_synbiohub_callers_cannot_bypass_the_guard(module):
    """A module that still imports requests could call SynBioHub unguarded."""
    assert not hasattr(module, 'requests')
