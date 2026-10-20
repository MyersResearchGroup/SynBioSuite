"""Outbound HTTP to SynBioHub, refusing any destination that is not public.

The SynBioHub base URL comes from the caller -- X-SynBioHub-Url or the study URI
on /api/v1, the sbh_url param on the legacy routes -- so unchecked, the server
would request whatever address the caller names, cloud metadata and internal
services included (review H5).

Resolving the name up front and connecting later leaves a DNS-rebinding window,
so the check runs on the connected socket instead: after the TCP connect and
before the first byte (request line, X-authorization token, TLS ClientHello)
goes out. Redirect hops open new connections, so they are checked too.

Every SynBioHub call goes through get()/post() here; the tests patch those two.
"""
from __future__ import annotations

import ipaddress
import os
from urllib.parse import urlparse, urlsplit

import requests
from requests.adapters import HTTPAdapter
from urllib3.connection import HTTPConnection, HTTPSConnection
from urllib3.connectionpool import HTTPConnectionPool, HTTPSConnectionPool

# Operator config: the SynBioHub the server defaults to. Its origin is trusted
# even when it is private -- that is what lets a local SynBioHub (e.g.
# http://localhost:7777) work in development. Callers cannot widen it.
SBH_URL_ENV = 'SBS_SBH_URL'

_DEFAULT_PORTS = {'http': 80, 'https': 443}

# IPv6 prefixes whose last 32 bits are the IPv4 address actually reached, but
# which ipaddress reports as global whatever that address is. (::ffff:0:0/96 is
# handled by IPv6Address.ipv4_mapped.)
_IPV4_EMBEDDING_PREFIXES = (
    ipaddress.ip_network('64:ff9b::/96'),     # NAT64 well-known prefix, RFC 6052
    ipaddress.ip_network('::ffff:0:0:0/96'),  # IPv4-translated, RFC 2765
)
_LOW_32_BITS = 0xFFFFFFFF


class BlockedDestinationError(Exception):
    """A SynBioHub URL led to an address the server must not contact.

    Deliberately not an OSError: urllib3 and requests retry and wrap those, and
    this has to reach the route intact so it can answer 400.
    """


class SynBioHubError(Exception):
    """SynBioHub answered, and the answer was a refusal or was unusable.

    The message says what was asked and what came back, and is written to be
    shown to the caller.
    """


def is_public_address(address: str) -> bool:
    """True for a globally routable unicast address."""
    ip = ipaddress.ip_address(address)
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        elif any(ip in prefix for prefix in _IPV4_EMBEDDING_PREFIXES):
            ip = ipaddress.IPv4Address(int(ip) & _LOW_32_BITS)
    return ip.is_global and not ip.is_multicast


def normalise_base_url(url) -> str:
    """Syntax-check a SynBioHub base URL and return it in canonical form.

    Adds https:// when no scheme is given and drops a trailing slash, as the
    routes always have. Raises ValueError for anything that could make the
    paths the backend appends land somewhere else: a query or fragment, which
    swallow them, or userinfo, which hides the real host.
    """
    if not isinstance(url, str) or not url.strip():
        raise ValueError('a SynBioHub URL is required')
    url = url.strip()
    if '?' in url or '#' in url:
        raise ValueError('it must not contain a query string or fragment')
    if '://' not in url:
        url = 'https://' + url

    parts = urlsplit(url)
    if parts.scheme not in _DEFAULT_PORTS:
        raise ValueError('it must be an http(s) URL')
    if '@' in parts.netloc:
        raise ValueError('it must not contain credentials')
    if not parts.hostname:
        raise ValueError('it has no host')
    try:
        _ = parts.port  # urlsplit only validates the port when it is read
    except ValueError:
        raise ValueError('it has an invalid port') from None

    return f'{parts.scheme}://{parts.netloc}{parts.path.rstrip("/")}'


def rebase_uri(sbh_url: str, resource_uri: str) -> str:
    """Point a resource URI at the SynBioHub API base, keeping only its path.

    SPARQL returns web URIs (https://synbiohub.org/user/...) while requests have
    to go to the API host (https://api.synbiohub.org/user/...). Those URIs are
    stored data, so their host is never used.
    """
    return sbh_url.rstrip('/') + urlparse(resource_uri).path


def request(method: str, url: str, **kwargs) -> requests.Response:
    """requests.request, refusing non-public destinations at connect time."""
    with requests.Session() as session:
        # Proxy env vars would send the request through a pool manager this
        # guard does not wrap, so the target would go unchecked. Always direct.
        session.trust_env = False
        adapter = _PublicOnlyAdapter()
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        return session.request(method, url, **kwargs)


def get(url: str, **kwargs) -> requests.Response:
    return request('GET', url, **kwargs)


def post(url: str, **kwargs) -> requests.Response:
    return request('POST', url, **kwargs)


def _trusted_origin():
    """(host, port) of SBS_SBH_URL, or None. Read per check so tests can set it."""
    configured = os.environ.get(SBH_URL_ENV, '')
    try:
        parts = urlsplit(normalise_base_url(configured))
    except ValueError:
        return None
    return parts.hostname, parts.port or _DEFAULT_PORTS[parts.scheme]


class _PublicOnlyMixin:
    """Checks the peer address of every new connection before it is used."""

    def _new_conn(self):
        sock = super()._new_conn()
        address = sock.getpeername()[0]
        if is_public_address(address) or (self.host.lower(), self.port) == _trusted_origin():
            return sock

        sock.close()
        # Name the host the caller gave, never the address it resolved to.
        raise BlockedDestinationError(
            f'Refusing to connect to {self.host}: it resolves to a non-public address'
        )


class _GuardedHTTPConnection(_PublicOnlyMixin, HTTPConnection):
    pass


class _GuardedHTTPSConnection(_PublicOnlyMixin, HTTPSConnection):
    pass


class _GuardedHTTPConnectionPool(HTTPConnectionPool):
    ConnectionCls = _GuardedHTTPConnection


class _GuardedHTTPSConnectionPool(HTTPSConnectionPool):
    ConnectionCls = _GuardedHTTPSConnection


class _PublicOnlyAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        super().init_poolmanager(*args, **kwargs)
        self.poolmanager.pool_classes_by_scheme = {
            'http': _GuardedHTTPConnectionPool,
            'https': _GuardedHTTPSConnectionPool,
        }
