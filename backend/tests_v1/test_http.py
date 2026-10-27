"""sbs_v1.http: which addresses count as public, and the default timeout."""
import pytest
import requests

from sbs_v1 import http


@pytest.mark.parametrize("address, public", [
    ("8.8.8.8", True),
    ("2606:4700:4700::1111", True),
    ("::ffff:8.8.8.8", True),         # IPv4-mapped public address
    ("64:ff9b::808:808", True),       # NAT64 of 8.8.8.8
    ("10.0.0.1", False),
    ("172.16.5.4", False),
    ("192.168.1.1", False),
    ("169.254.169.254", False),       # cloud metadata
    ("127.0.0.1", False),
    ("::1", False),
    ("fc00::1", False),
    ("::ffff:127.0.0.1", False),      # IPv4-mapped loopback
    ("::ffff:10.0.0.1", False),       # IPv4-mapped private
    ("64:ff9b::7f00:1", False),       # NAT64 of 127.0.0.1
    ("::ffff:0:a9fe:a9fe", False),    # IPv4-translated 169.254.169.254
    ("224.0.0.1", False),             # multicast
])
def test_is_public_address(address, public):
    assert http.is_public_address(address) is public


def test_default_timeout_is_applied_and_can_be_overridden(monkeypatch):
    seen = []
    monkeypatch.setattr(requests.Session, "request",
                        lambda self, method, url, **kwargs: seen.append(kwargs["timeout"]))

    http.get("https://example.org")
    http.get("https://example.org", timeout=1)

    assert seen == [(5, 30), 1]


def test_proxy_settings_are_ignored(monkeypatch):
    seen = []
    monkeypatch.setattr(requests.Session, "request",
                        lambda self, method, url, **kwargs: seen.append(self.trust_env))

    http.get("https://example.org")

    assert seen == [False]
