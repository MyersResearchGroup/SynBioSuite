"""The public-address guard, on real loopback sockets. http.get is not patched here.

The point is to prove a blocked connection is dropped before a single byte
(request line, X-authorization token, TLS ClientHello) leaves the process.
"""
import json
import socket
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from sbs_v1 import http

ITEM_URI = "https://sbh.example.org/user/alice/study1/a/1"
LISTEN_SECONDS = 2


class Listener:
    """A loopback TCP port that records whatever a client sends it."""

    def __init__(self):
        self._server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server.bind(("127.0.0.1", 0))
        self._server.listen(4)
        self._server.settimeout(LISTEN_SECONDS)
        self.port = self._server.getsockname()[1]
        self.url = f"http://127.0.0.1:{self.port}"

    def received(self):
        """Every byte sent on the first connection, or b'' if none arrived."""
        try:
            conn, _ = self._server.accept()
        except socket.timeout:
            return b""
        conn.settimeout(LISTEN_SECONDS)
        chunks = []
        with conn:
            while chunk := conn.recv(65536):
                chunks.append(chunk)
        return b"".join(chunks)

    def close(self):
        self._server.close()


@pytest.fixture
def listener():
    port = Listener()
    yield port
    port.close()


class _SparqlHandler(BaseHTTPRequestHandler):
    """Answers every GET with one SPARQL row, and records what was asked."""

    requests_seen = []

    def do_GET(self):
        self.requests_seen.append((self.path, self.headers.get("X-authorization")))
        body = json.dumps({"results": {"bindings": [
            {"s": {"value": ITEM_URI}, "id": {"value": "a"}}]}}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


@pytest.fixture
def local_synbiohub():
    """A real HTTP server on loopback, standing in for a local SynBioHub."""
    handler = type("Handler", (_SparqlHandler,), {"requests_seen": []})
    server = HTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    server.url = f"http://127.0.0.1:{server.server_address[1]}"
    yield server
    server.shutdown()
    server.server_close()


@pytest.mark.parametrize("scheme", ["http", "https"])  # https: refused before the TLS handshake
def test_loopback_is_refused_before_any_byte_is_sent(listener, scheme):
    with pytest.raises(http.BlockedDestinationError):
        http.get(f"{scheme}://127.0.0.1:{listener.port}/sparql",
                 headers={"X-authorization": "secret-token"})

    assert listener.received() == b""


def test_handle_answers_400_for_a_loopback_synbiohub_url(get_strains, listener):
    body, status, _ = get_strains(**{"X-SynBioHub-Url": listener.url})

    assert status == 400
    assert body["error"].startswith("Refusing to connect to 127.0.0.1: ")
    assert listener.received() == b""


def test_the_configured_sbs_sbh_url_is_trusted(get_strains, local_synbiohub, monkeypatch):
    monkeypatch.setenv(http.SBH_URL_ENV, local_synbiohub.url)

    body, status, _ = get_strains(**{"X-SynBioHub-Url": local_synbiohub.url})

    assert status == 200
    assert [item["uri"] for item in body] == [ITEM_URI]
    ((path, token),) = local_synbiohub.RequestHandlerClass.requests_seen
    assert path.startswith("/sparql?query=")
    assert token == "test-token"


def test_trust_covers_that_origin_only(get_strains, local_synbiohub, listener, monkeypatch):
    monkeypatch.setenv(http.SBH_URL_ENV, local_synbiohub.url)

    body, status, _ = get_strains(**{"X-SynBioHub-Url": listener.url})

    assert status == 400
    assert listener.received() == b""
